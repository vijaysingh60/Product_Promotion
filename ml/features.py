"""Shared by train.py and server.py: where the data lives and how a model input row is built."""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.environ.get("DATA_DIR", ROOT.parent / "dmart_synthetic_dataset"))
ARTIFACTS = ROOT / "artifacts"
MODEL_PATH = ARTIFACTS / "uplift_model.json"
META_PATH = ARTIFACTS / "metadata.json"

# What the model sees.
NUMERIC = ["discount_pct", "price", "margin_pct", "customer_affinity", "regional_demand_score"]
CATEGORICAL = ["category", "customer_segment", "location"]
FEATURES = NUMERIC + CATEGORICAL
# What it predicts: % change in units sold versus baseline when the promotion runs.
TARGET = "sales_uplift_pct"

DISCOUNTS = [5, 10, 15, 20, 25, 30]
KEY = ["product_id", "customer_segment", "location"]


def load_combos() -> pd.DataFrame:
    """One row per product x segment x location, with the static features and baseline demand."""
    return pd.read_csv(DATA_DIR / "promotion_model_data.csv")


def load_training_frame() -> pd.DataFrame:
    """Past promotions joined with the features of their product x segment x location."""
    promotions = pd.read_csv(DATA_DIR / "promotions.csv")
    static = load_combos()[KEY + ["category", "price", "margin_pct", "customer_affinity", "regional_demand_score"]]
    return promotions.merge(static, on=KEY, how="inner", validate="many_to_one")


def category_levels(combos: pd.DataFrame) -> dict[str, list[str]]:
    return {col: sorted(combos[col].unique()) for col in CATEGORICAL}


def to_model_frame(df: pd.DataFrame, levels: dict[str, list[str]]) -> pd.DataFrame:
    """Select the feature columns and pin categorical levels so training and serving encode identically."""
    X = df[FEATURES].copy()
    for col in CATEGORICAL:
        X[col] = pd.Categorical(X[col], categories=levels[col])
    return X
