# PromoPilot Hackathon Study Guide

## Goal Of This Guide

Use this file when the team has about 1 hour to understand and explain the project.
It avoids deep code details and focuses on what to say, what to show, and why the project matters.

## 1. One-Minute Project Explanation

PromoPilot is a promotion and inventory planning system for retail teams.

It answers one business question:

> Which product should we promote, to which customer segment, in which city, at what discount, without breaking profit or stock rules?

Most promotion systems only look at customer interest. PromoPilot also checks:

- Product margin
- Current stock
- City-wise inventory
- Expected demand
- Customer segment behavior
- Past campaign response
- Marketing budget
- Stockout risk

The system can recommend a promotion, reject it, or suggest an alternative.

## 2. The Problem We Are Solving

Retail promotions can go wrong in many ways:

- A discount may attract customers but destroy profit margin.
- A product may be popular but have low stock.
- One city may have enough stock while another city does not.
- Customers may already be planning to buy, so the discount gives away margin unnecessarily.
- Too many campaigns to the same segment can create fatigue.
- A marketing budget can be spent on weak promotions instead of profitable ones.

PromoPilot prevents these mistakes by combining promotion planning with inventory and profit checks.

## 3. The Core Idea

A simple recommender says:

```text
Customer likes product
=> Give discount
```

PromoPilot says:

```text
Customer segment likes product
=> Check legal discount range
=> Check stock and safety stock
=> Predict demand and response
=> Compare profit with promotion vs without promotion
=> Check marketing cost and budget
=> Recommend only if incremental profit is positive
```

The key phrase for the presentation:

> We do not promote what is merely popular. We promote what is profitable, available, and safe to sell.

## 4. What The App Does

The app has five main areas:

- Dashboard: overall plan, KPIs, profit impact, charts, and assumptions.
- Recommendations: every product, segment, and city decision.
- Inventory: city-wise stock health and demand pressure.
- Customer segments: segment behavior, affinity, and price sensitivity.
- What-if simulator: test a product, segment, city, and discount manually.

## 5. Main Business Rules

These are the rules the engine never breaks:

| Rule | Meaning |
|---|---|
| Offer price must be at least cost price plus margin floor | Avoids unprofitable discounts |
| Offer price cannot exceed MRP | Keeps pricing realistic |
| Safety stock is protected | Avoids selling too much stock |
| Stock is city-wise | Hyderabad stock cannot be used for Mumbai |
| Promotions are judged by incremental profit | Compares promotion profit against doing nothing |
| Marketing budget is limited | Only the best candidates get funded |
| Stock cannot be double-claimed | Two promotions cannot use the same available stock |

## 6. Important Terms

**MRP**  
Maximum retail price. This is the normal selling price.

**CP**  
Cost price. The business should not discount so much that it loses required margin.

**Margin floor**  
Minimum profit buffer above cost price. Default is 5 percent.

**Safety stock**  
Stock kept aside to avoid stockouts. Default is 15 percent.

**Safe units**  
Stock minus safety stock. Promotions can only use safe units.

**Incremental profit**  
Extra profit from running the promotion compared with not running it.

**Promo cost**  
Cost of contacting customers. Default is Rs. 3 per contact.

**Clearance promotion**  
A promotion for overstocked slow-moving products where clearing inventory has extra value.

**Segment fatigue**  
Reduced response when the same customer segment receives too many campaigns.

## 7. How The Decision Engine Works

For every product, customer segment, and city, the engine follows this flow:

1. Load product, stock, city, segment, and season data.
2. Calculate the legal discount range using CP, MRP, and margin floor.
3. Try discounts in small steps.
4. Estimate customer response.
5. Estimate demand lift.
6. Check inventory and stockout risk.
7. Calculate baseline profit without promotion.
8. Calculate profit with promotion.
9. Subtract marketing cost.
10. Pick the best risk-adjusted option.
11. Reject if the promotion is not profitable or not safe.
12. Allocate budget to the best promotions first.

Simple explanation:

> The engine tests many possible discounts and keeps only the ones that are legal, profitable, and safe for stock.

## 8. Key Files To Know

| File | Purpose |
|---|---|
| `README.md` | Short project overview |
| `lib/config.ts` | Business assumptions like margin floor, safety stock, budget |
| `lib/pricing.ts` | Legal discount band logic |
| `lib/decisionEngine.ts` | Main promotion decision engine |
| `lib/models/responseModel.ts` | Predicts segment response probability |
| `lib/models/demandModel.ts` | Predicts baseline and promoted demand |
| `lib/models/inventoryModel.ts` | Calculates stock risk and safe units |
| `lib/analytics.ts` | Dashboard KPIs and chart data |
| `lib/mockData.ts` | Products, inventory, segments, past promotions |
| `scripts/verify.mts` | Console test that checks important rules |
| `components/*` | UI tables, dashboard, charts, simulator |
| `app/*` | Next.js pages |

## 9. Demo Cases To Explain

The verification script checks three important demo cases.

### Case A: High Demand But Low Stock

Example:

```text
Wireless Headphones - Students - Hyderabad
```

What happens:

- Students like the product.
- Demand is good.
- But stock is limited.
- The system recommends a smaller audience and controlled discount.

How to explain:

> The product is attractive, but the system protects stock. It does not blindly send the offer to everyone.

### Case B: Thin Margin Product

Example:

```text
Television
```

What happens:

- The product margin is too thin.
- Any meaningful discount would break the minimum margin rule.
- The system rejects the promotion.

How to explain:

> Popularity is not enough. If the discount breaks margin rules, the system says no.

### Case C: Overstocked Slow Mover

Example:

```text
Coffee Maker - Families - Chennai
```

What happens:

- Stock is high.
- Product is slow-moving.
- The system recommends a clearance promotion.
- It counts the benefit of freeing excess inventory.

How to explain:

> Sometimes promotion is not just about selling more. It is also about reducing inventory holding cost.

## 10. Suggested 1-Hour Team Preparation Plan

### First 10 minutes: Understand the problem

Everyone should be able to explain:

- Why blind discounts are risky.
- Why inventory and profit matter.
- Why city-wise stock matters.

### Next 15 minutes: Understand the engine

Focus on:

- Legal discount range
- Response prediction
- Demand prediction
- Inventory safety
- Incremental profit
- Budget allocation

### Next 15 minutes: Walk through the UI

Open the app and visit:

- Dashboard
- Recommendations
- Inventory
- What-if simulator

### Next 10 minutes: Prepare demo story

Use the three demo cases:

- Low stock controlled promotion
- Thin margin rejection
- Overstock clearance

### Last 10 minutes: Practice Q&A

Each person should answer:

- What is the project?
- What makes it intelligent?
- Why is it useful for business?
- How does it avoid bad promotions?
- What can be improved later?

## 11. Suggested Presentation Flow

### Opening

> Retailers often run discounts to increase sales, but a bad discount can reduce profit, create stockouts, or waste marketing budget. PromoPilot solves this by connecting promotion decisions with inventory and profitability.

### Problem

> Existing promotion decisions are often made separately from stock and margin constraints. A product may be popular, but if stock is low or margin is thin, promoting it can hurt the business.

### Solution

> PromoPilot evaluates every product, segment, and city. It checks the legal discount range, expected demand, response probability, available stock, and marketing cost. Then it recommends only the promotions that create positive incremental profit.

### Demo

Show:

1. Dashboard for overall result.
2. Recommendations table for decisions.
3. Inventory page for city-wise stock.
4. Simulator for changing discount and seeing impact.

### Closing

> The value of PromoPilot is not just recommendation. It is responsible recommendation: profitable, explainable, and inventory-aware.

## 12. Common Questions And Answers

### Q1. Is this only a recommendation system?

No. It is a decision-support system. It combines recommendation, pricing rules, demand prediction, stock checks, and budget allocation.

### Q2. Why not promote every popular product?

Because popular products may already sell without discounts, may have low stock, or may not have enough margin.

### Q3. What is the role of AI here?

The project uses model-style components for response, demand, and inventory estimation. They are deterministic in this version, but the code is structured so trained models can replace them later.

### Q4. Why is incremental profit important?

Because we need to compare profit with promotion against profit without promotion. If customers would buy anyway, the discount may reduce profit.

### Q5. How does the app prevent stockouts?

It protects safety stock, caps expected buyers, calculates stockout probability, and avoids double-claiming the same stock for multiple promotions.

### Q6. What happens if the budget is not enough?

The allocator funds the best promotions first based on return on promotion cost. Lower-priority promotions become unfunded.

### Q7. Can this work with real data?

Yes. The current app uses mock data and deterministic models. Real product, inventory, transaction, and campaign data can replace the mock data. Trained ML models can replace the stub models.

### Q8. What are the limitations?

- No real database in this version.
- No authentication.
- No per-customer targeting.
- No live external API calls.
- ML service exists in the repo but is not connected to the main app.

## 13. What To Say If Judges Ask About Scalability

Current version:

- Runs in TypeScript.
- Uses seeded data.
- Computes plans deterministically.
- No external services are required.

Production version:

- Store products, inventory, and transactions in a database.
- Replace deterministic model functions with trained ML services.
- Add user authentication and role-based access.
- Add live inventory feeds.
- Add campaign execution integrations.

## 14. What To Say If Judges Ask About Business Impact

PromoPilot helps a retailer:

- Avoid margin-killing discounts.
- Reduce stockout risk.
- Clear overstocked products.
- Spend marketing budget on better promotions.
- Explain why a promotion is approved or rejected.
- Make city-wise decisions instead of one national decision.

## 15. Quick Command Reference

Install dependencies:

```bash
npm install
```

Run app:

```bash
npm run dev
```

Run verification:

```bash
npm run verify
```

Expected verification result:

```text
ALL CHECKS PASSED
```

## 16. Team Member Speaking Roles

Use this split if multiple people present:

| Person | Topic |
|---|---|
| Person 1 | Problem statement and business need |
| Person 2 | How the decision engine works |
| Person 3 | UI walkthrough and demo cases |
| Person 4 | Technical architecture and future improvements |

## 17. Final Memory Line

If the team remembers only one sentence, remember this:

> PromoPilot recommends promotions only when they are profitable, explainable, and safe for inventory.

