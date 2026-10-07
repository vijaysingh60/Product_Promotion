#!/usr/bin/env python3
"""Local prediction service for the promotion-uplift model.

    python3 ml/server.py          # http://127.0.0.1:8000  (docs at /docs)

Endpoints
    GET  /health        model info and metrics
    POST /predict       uplift + demand for specific promotions
    GET  /predict/all   uplift for every product x segment x location at every discount
"""
from __future__ import annotations

import json
import os

import numpy as np
import pandas as pd
import uvicorn
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from features import DISCOUNTS, KEY, META_PATH, MODEL_PATH, load_combos, to_model_frame

if not MODEL_PATH.exists():
    raise SystemExit("No trained model found. Run `python3 ml/train.py` first.")

META = json.loads(META_PATH.read_text())
MODEL = xgb.XGBRegressor()
MODEL.load_model(MODEL_PATH)
COMBOS = load_combos()
MODEL_INFO = {k: META[k] for k in ("name", "r2", "mae", "rows", "trainedAt")}

app = FastAPI(title="Promotion uplift model", version="1.0")


def predict_uplift(rows: pd.DataFrame) -> np.ndarray:
    """rows needs the combo feature columns plus discount_pct. Returns uplift in percent."""
    return MODEL.predict(to_model_frame(rows, META["levels"]))


class Item(BaseModel):
    productId: str
    segment: str
    location: str
    discount: float = Field(ge=0, le=50)


class PredictRequest(BaseModel):
    items: list[Item] = Field(min_length=1, max_length=20000)


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_INFO, "combos": len(COMBOS)}


@app.post("/predict")
def predict(request: PredictRequest):
    asked = pd.DataFrame(
        [{"product_id": i.productId, "customer_segment": i.segment, "location": i.location, "discount_pct": i.discount}
         for i in request.items]
    )
    rows = asked.merge(COMBOS, on=KEY, how="left")
    unknown = rows[rows["price"].isna()]
    if len(unknown):
        first = unknown.iloc[0]
        raise HTTPException(404, f"Unknown combination: {first.product_id} / {first.customer_segment} / {first.location}")

    uplift = predict_uplift(rows)
    baseline = rows["dummy_predicted_demand"].to_numpy()
    demand = np.rint(baseline * (1 + uplift / 100)).astype(int)
    return {
        "model": MODEL_INFO,
        "predictions": [
            {
                "productId": item.productId,
                "segment": item.segment,
                "location": item.location,
                "discount": item.discount,
                "upliftPct": round(float(u), 2),
                "baselineDemand": int(b),
                "predictedDemand": int(d),
            }
            for item, u, b, d in zip(request.items, uplift, baseline, demand)
        ],
    }


@app.get("/predict/all")
def predict_all():
    """Uplift grid for the whole catalogue: {"P0001|Students|Hyderabad": [u@5, u@10, ...], ...}."""
    rows = COMBOS.loc[COMBOS.index.repeat(len(DISCOUNTS))].reset_index(drop=True)
    rows["discount_pct"] = np.tile(DISCOUNTS, len(COMBOS))
    uplift = predict_uplift(rows).astype(float).reshape(len(COMBOS), len(DISCOUNTS)).round(2)
    keys = COMBOS["product_id"] + "|" + COMBOS["customer_segment"] + "|" + COMBOS["location"]
    return {"model": MODEL_INFO, "discounts": DISCOUNTS, "uplift": dict(zip(keys, uplift.tolist()))}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("ML_PORT", "8000")))
