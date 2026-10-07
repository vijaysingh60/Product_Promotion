#!/usr/bin/env python3
"""Train the promotion-uplift model.

    python3 ml/train.py

Target : sales_uplift_pct of past promotions (promotions.csv)
Model  : small XGBoost regressor (100 trees, depth 2), uplift forced to be non-decreasing in discount
Output : ml/artifacts/uplift_model.json + metadata.json (read by ml/server.py)
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

import pandas as pd
import xgboost as xgb
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_val_predict

from features import (
    ARTIFACTS, DISCOUNTS, FEATURES, META_PATH, MODEL_PATH, TARGET,
    category_levels, load_combos, load_training_frame, to_model_frame,
)

PARAMS = dict(
    n_estimators=100,
    max_depth=2,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.9,
    min_child_weight=5,
    tree_method="hist",
    enable_categorical=True,
    monotone_constraints={"discount_pct": 1},  # a bigger discount never predicts a smaller uplift
    random_state=42,
)


def cross_validate(model, X: pd.DataFrame, y: pd.Series) -> dict[str, float]:
    """5-fold out-of-fold predictions, so every row is scored by a model that never saw it."""
    folds = KFold(n_splits=5, shuffle=True, random_state=42)
    pred = cross_val_predict(model, X, y, cv=folds)
    return {"r2": round(float(r2_score(y, pred)), 4), "mae": round(float(mean_absolute_error(y, pred)), 2)}


def main() -> None:
    combos = load_combos()
    levels = category_levels(combos)
    train = load_training_frame()
    X, y = to_model_frame(train, levels), train[TARGET]
    print(f"Training rows: {len(train)}  |  features: {len(FEATURES)}  |  target: {TARGET}")

    # Compare against two simple baselines so we know what the model actually adds.
    results = {
        "predict the mean": cross_validate(DummyRegressor(), X, y),
        "straight line on discount only": cross_validate(LinearRegression(), X[["discount_pct"]], y),
        "XGBoost (all features)": cross_validate(xgb.XGBRegressor(**PARAMS), X, y),
    }
    print("\n5-fold cross-validation (uplift, percentage points)")
    for name, m in results.items():
        print(f"  {name:<32} R2 = {m['r2']:>7.4f}   MAE = {m['mae']:>5.2f}")

    model = xgb.XGBRegressor(**PARAMS).fit(X, y)

    gain = model.get_booster().get_score(importance_type="total_gain")
    total = sum(gain.values()) or 1.0
    importance = {f: round(gain.get(f, 0.0) / total, 4) for f in FEATURES}
    print("\nFeature importance (share of total gain)")
    for f, share in sorted(importance.items(), key=lambda kv: -kv[1]):
        print(f"  {f:<24} {share:6.1%}")

    ARTIFACTS.mkdir(exist_ok=True)
    model.save_model(MODEL_PATH)
    meta = {
        "name": "XGBoost uplift model",
        "target": TARGET,
        "features": FEATURES,
        "levels": levels,
        "discounts": DISCOUNTS,
        "rows": len(train),
        "r2": results["XGBoost (all features)"]["r2"],
        "mae": results["XGBoost (all features)"]["mae"],
        "baselines": {k: v for k, v in results.items() if not k.startswith("XGBoost")},
        "importance": importance,
        "trainedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "xgboostVersion": xgb.__version__,
    }
    META_PATH.write_text(json.dumps(meta, indent=2))
    print(f"\nSaved {MODEL_PATH.relative_to(ARTIFACTS.parent.parent)} and {META_PATH.relative_to(ARTIFACTS.parent.parent)}")


if __name__ == "__main__":
    main()
