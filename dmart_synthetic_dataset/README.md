# Synthetic DMart-like Retail Dataset

This dataset is SYNTHETIC and is not official DMart data.
It is designed for the TCS Tech Day "AI-Driven Personalized Promotion and Inventory Alignment Planner" hackathon.

Files:
- customers.csv: customer profiles and segments
- products.csv: product catalogue and economics
- inventory.csv: product stock by location
- transactions.csv: historical purchase transactions
- promotions.csv: historical promotion/campaign outcomes
- promotion_model_data.csv: convenient product × customer segment × location modeling dataset

Suggested ML target later:
- `dummy_predicted_demand` can be replaced with a real future-demand target built from transactions.
- You can also create a classification target such as `promotion_success` from historical uplift/profit.

IMPORTANT:
Do not claim this data came from DMart. It is simulated retail data inspired by a DMart-like use case.
