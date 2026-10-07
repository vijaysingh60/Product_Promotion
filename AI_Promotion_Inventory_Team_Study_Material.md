# AI-Driven Personalized Promotion & Inventory Alignment Planner

## Complete Team Study Material

> **Purpose:** This document is for understanding the project before
> implementation.\
> It focuses on the problem, business logic, AI concepts, data,
> examples, trade-offs, demo reasoning, and likely presentation
> questions.

------------------------------------------------------------------------

# 1. The Project in One Minute

### The problem

Retailers often decide promotions using only part of the available
information.

For example:

-   Customers may like a product.
-   But the product may already be almost out of stock.
-   Or demand may be very high.
-   Or the discount may destroy the profit margin.
-   Or the promotion may work in one region but not another.

Therefore, simply asking:

> "What does the customer like?"

is not enough.

### Our project

We want to build a decision-support system that combines:

**Customer preference + demand + inventory + margin + promotion
history + regional demand**

to recommend:

> **Who should receive which promotion, on which product, where, and
> whether the promotion should happen at all.**

The system should also explain **why**.

------------------------------------------------------------------------

# 2. The Most Important Idea

A basic recommendation system might think:

``` text
Customer likes shoes
        ↓
Recommend shoe discount
```

Our system thinks:

``` text
Customer likes shoes
        ↓
Check current inventory
        ↓
Check expected demand
        ↓
Check profit margin
        ↓
Check promotion history
        ↓
Check regional demand
        ↓
Evaluate promotion
        ↓
PROMOTE / LIMITED PROMOTION / DO NOT PROMOTE
```

This difference is the heart of the project.

------------------------------------------------------------------------

# 3. The Five Questions Our System Answers

Everyone on the team should remember these.

### 1. WHO?

Which customer or customer segment should receive the offer?

### 2. WHAT?

Which product or category should be promoted?

### 3. HOW?

What type of promotion should be used?

Examples:

-   10% discount
-   15% discount
-   fixed amount coupon
-   bundle
-   free shipping

### 4. SHOULD WE?

Should we promote it at all?

This depends on:

-   inventory
-   demand
-   profit
-   risk

### 5. WHY?

Why did the system recommend this promotion?

------------------------------------------------------------------------

# 4. Business Problem in Simple Words

Imagine a retailer has:

  Product            Stock   Expected Demand   Customer Interest
  ---------------- ------- ----------------- -------------------
  Running Shoes         20               100                High
  Sports T-shirt       800               150                High
  Laptop                15                40                High
  Jacket               500               100              Medium

A normal marketing system might say:

> "Running Shoes have high customer interest, so promote them."

But that can be a bad business decision.

Running shoes:

-   Stock = 20
-   Expected demand = 100

They are already likely to sell out.

A promotion may make the shortage worse.

The system should instead consider the Sports T-shirt:

-   High customer interest
-   High inventory
-   Moderate demand
-   Potentially healthy margin

So:

> **The best promotion is not always the most popular product.**

------------------------------------------------------------------------

# 5. Why This Problem Exists

Retail organizations often have separate teams.

### Marketing

Knows:

> Customers respond to promotions.

### Inventory / Operations

Knows:

> Current stock levels.

### Sales

Knows:

> Current sales and demand.

### Finance

Knows:

> Margin and profitability.

The problem is that these teams may not have one shared decision view.

Our system tries to bring these signals together.

------------------------------------------------------------------------

# 6. Important Terms

## 6.1 Customer Preference

What a customer tends to buy or interact with.

Example:

``` text
Customer A

Shoes: 5 purchases
Sports T-shirts: 3 purchases
Laptops: 0 purchases
```

Customer A has strong sports-product preference.

------------------------------------------------------------------------

## 6.2 Customer Affinity

Affinity means:

> How strongly a customer is associated with or interested in a
> product/category.

Example:

``` text
Customer A → Running Shoes = 92/100
Customer A → Laptop = 15/100
```

Higher affinity means the product is more relevant to that customer.

------------------------------------------------------------------------

## 6.3 Customer Segmentation

Grouping customers with similar behavior.

Examples:

-   Premium customers
-   Frequent customers
-   Discount-sensitive customers
-   Sports-product customers
-   Inactive customers

One common ML technique is **K-Means clustering**.

Simple explanation:

> K-Means groups customers whose behavior is similar.

------------------------------------------------------------------------

## 6.4 Inventory

The amount of product currently available.

Example:

``` text
Running Shoes = 20 units
T-shirts = 800 units
```

------------------------------------------------------------------------

## 6.5 Demand

How much customers are expected to want/buy.

Example:

``` text
Expected 7-day demand = 100 units
```

Demand is not the same as current stock.

------------------------------------------------------------------------

## 6.6 Demand Forecast

A prediction of future demand.

Example:

``` text
Current sales trend:
100 units/week

Forecast:
125 units next week
```

The prediction can consider:

-   past sales
-   seasonality
-   region
-   promotions
-   customer behavior

------------------------------------------------------------------------

## 6.7 Stockout

A stockout happens when customers want a product but the retailer does
not have enough inventory.

Example:

``` text
Inventory = 20
Expected demand = 100
```

Potential shortage = 80 units.

A promotion could make this worse.

------------------------------------------------------------------------

## 6.8 Overstock

Too much inventory compared with expected demand.

Example:

``` text
Inventory = 1,000
Expected demand = 100
```

A promotion may help move the excess stock.

------------------------------------------------------------------------

## 6.9 Cost

How much it costs the retailer to obtain/manufacture a product.

Example:

``` text
Selling price = ₹1,000
Cost = ₹700
```

------------------------------------------------------------------------

## 6.10 Profit

Simplified:

``` text
Profit = Selling Price - Cost
```

Example:

``` text
₹1,000 - ₹700 = ₹300
```

------------------------------------------------------------------------

## 6.11 Margin

A simple gross-margin percentage can be calculated as:

``` text
Margin % = (Selling Price - Cost) / Selling Price × 100
```

Example:

``` text
Selling price = ₹1,000
Cost = ₹700

Margin = 300 / 1000 × 100
       = 30%
```

------------------------------------------------------------------------

# 7. Why Margin Matters

Suppose Product A:

``` text
Price = ₹1,000
Cost = ₹700
Profit = ₹300
```

A 10% discount:

``` text
New price = ₹900
Profit = ₹200
```

A 30% discount:

``` text
New price = ₹700
Profit = ₹0
```

So:

> More discount does not automatically mean better business.

Another product may have a very low margin.

Example:

``` text
Price = ₹1,000
Cost = ₹900
Profit = ₹100
```

A 20% discount gives:

``` text
Price = ₹800
Cost = ₹900

Loss = ₹100
```

The AI should recognize this.

------------------------------------------------------------------------

# 8. Promotion

A promotion is an offer intended to influence customer behavior.

Examples:

-   10% OFF
-   20% OFF
-   ₹500 coupon
-   Buy 1 Get 1
-   Bundle discount
-   Free shipping

The goal may be:

-   increase sales
-   clear excess inventory
-   acquire customers
-   increase retention
-   increase profit
-   improve inventory turnover

------------------------------------------------------------------------

# 9. Promotion History

A retailer has historical campaign results.

Example:

``` text
Product: Sports T-shirt

Before promotion:
100 units sold

During promotion:
150 units sold
```

The promotion produced an increase.

A simple sales uplift can be represented as:

``` text
Uplift = (Promotion Sales - Baseline Sales) / Baseline Sales
```

Here:

``` text
(150 - 100) / 100 = 50%
```

This does not automatically mean profit increased. That is why we also
need margin and discount information.

------------------------------------------------------------------------

# 10. Regional Demand

Customers in different locations may behave differently.

Example:

``` text
Hyderabad:
Rain jackets → High demand

Another region:
Rain jackets → Low demand
```

Therefore, the same promotion does not necessarily make sense
everywhere.

The system can use:

-   location
-   regional sales
-   season
-   product preference

to adjust recommendations.

------------------------------------------------------------------------

# 11. The Main Data We Need

Think of the project as connecting several datasets.

## Customer Data

Possible fields:

``` text
customer_id
age
location
segment
```

Purpose:

> Understand who the customer is and where they belong.

------------------------------------------------------------------------

## Transaction Data

Possible fields:

``` text
transaction_id
customer_id
product_id
date
quantity
price
discount
```

Purpose:

> Understand what customers bought and how they behaved.

------------------------------------------------------------------------

## Product Data

Possible fields:

``` text
product_id
category
price
cost
margin
```

Purpose:

> Understand the commercial value of each product.

------------------------------------------------------------------------

## Inventory Data

Possible fields:

``` text
product_id
location
current_stock
```

Purpose:

> Understand availability and inventory risk.

------------------------------------------------------------------------

## Promotion Data

Possible fields:

``` text
promotion_id
product_id
discount
start_date
end_date
sales_before
sales_during
```

Purpose:

> Learn how previous promotions performed.

------------------------------------------------------------------------

## Regional Demand Data

Possible fields:

``` text
region
product_id
date
demand
```

Purpose:

> Understand regional demand patterns.

------------------------------------------------------------------------

# 12. How the Data Connects

The conceptual relationship is:

``` text
Customer
   ↓
Transactions
   ↓
Products
   ↓
Inventory
   ↓
Demand
   ↓
Promotion History
   ↓
Business Outcome
```

For example:

``` text
Customer 101
    ↓
Bought running shoes 5 times
    ↓
High affinity for sports
    ↓
Sports T-shirt is currently overstocked
    ↓
Demand is moderate
    ↓
Previous 15% promotion worked well
    ↓
Recommend 15% promotion
```

------------------------------------------------------------------------

# 13. The AI Components

Do not think that "AI" means one giant model.

The system can contain several analytical components.

------------------------------------------------------------------------

## 13.1 Customer Segmentation

Goal:

> Group similar customers.

Possible approach:

**K-Means clustering**

Example output:

``` text
Segment 1 → Premium frequent buyers
Segment 2 → Discount-sensitive buyers
Segment 3 → Sports-product buyers
Segment 4 → Inactive customers
```

------------------------------------------------------------------------

## 13.2 Customer-Product Affinity

Goal:

> Estimate how relevant a product is to a customer.

Example:

``` text
Customer A

Running Shoes = 92
Sports T-shirt = 85
Laptop = 12
```

Possible signals:

-   purchase frequency
-   recency
-   category preference
-   product views
-   previous response to promotions

------------------------------------------------------------------------

## 13.3 Demand Forecasting

Goal:

> Predict future demand.

Example:

``` text
Current stock = 100
Forecast demand = 250
```

This indicates potential inventory pressure.

Models could range from simple statistical methods to ML forecasting.

For a prototype, explainability and reliability are more important than
using the most complicated model.

------------------------------------------------------------------------

## 13.4 Inventory Risk

A simple conceptual ratio:

``` text
Demand / Inventory
```

Example:

``` text
Demand = 200
Inventory = 50

Risk ratio = 4
```

Higher ratio means greater pressure on inventory.

This can be improved using:

-   safety stock
-   lead time
-   reorder level
-   forecast uncertainty

------------------------------------------------------------------------

## 13.5 Promotion Effectiveness

Estimate whether a promotion is likely to improve outcomes.

Useful historical signals:

-   sales uplift
-   conversion uplift
-   profit impact
-   inventory movement
-   customer response

------------------------------------------------------------------------

# 14. The Most Important Part: Recommendation Engine

This is where all signals meet.

Conceptually:

``` text
Customer Affinity
        +
Demand
        +
Inventory
        +
Margin
        +
Promotion History
        +
Regional Demand
        ↓
Promotion Decision
```

The output could be:

``` text
PROMOTE
LIMITED PROMOTION
DO NOT PROMOTE
```

------------------------------------------------------------------------

# 15. Why We Should Use a Hybrid Approach

Not every decision needs machine learning.

### AI / ML

Good for:

-   predicting demand
-   identifying customer patterns
-   estimating affinity
-   learning promotion response

### Business rules

Good for hard constraints.

Example:

``` text
IF inventory is critically low
THEN do not recommend aggressive promotion
```

Or:

``` text
IF expected profit is negative
THEN reject promotion
```

Therefore:

> **AI predicts; business rules protect the business; the recommendation
> engine combines both.**

This is an important presentation point.

------------------------------------------------------------------------

# 16. Example of a Recommendation

Suppose:

``` text
Product:
Sports T-shirt

Customer affinity:
90/100

Inventory:
800 units

Forecast demand:
150 units

Margin:
45%

Historical promotion uplift:
18%

Region:
Hyderabad
```

The system may recommend:

> **15% OFF**

Reason:

-   Strong customer relevance
-   Healthy inventory
-   Moderate demand
-   Healthy margin
-   Positive historical response

------------------------------------------------------------------------

# 17. Example of a Rejection

Suppose:

``` text
Product:
Running Shoes

Customer affinity:
95/100

Inventory:
20

Forecast demand:
100

Margin:
30%
```

A naive recommendation system may say:

> "Customer loves shoes → 20% OFF."

Our system should say:

> **DO NOT AGGRESSIVELY PROMOTE**

Reason:

-   Inventory is low
-   Expected demand is already high
-   Promotion can increase stockout risk

This is one of the strongest examples for the demo.

------------------------------------------------------------------------

# 18. Another Important Example: Profit vs Sales

Suppose:

### Option A

10% discount:

``` text
Expected sales = 120
Expected profit = ₹30,000
```

### Option B

30% discount:

``` text
Expected sales = 170
Expected profit = ₹15,000
```

Option B sells more.

But Option A makes more profit.

Therefore:

> **The system should not blindly maximize sales.**

It should optimize the business objective.

------------------------------------------------------------------------

# 19. What Does "Optimization" Mean Here?

Optimization means finding a good decision while considering multiple
objectives and constraints.

For example:

> Maximize expected profit

while respecting:

-   inventory availability
-   campaign budget
-   minimum margin
-   stockout risk
-   customer relevance

The project can therefore be described as a **decision-support /
optimization problem**, even if the prototype uses a simpler scoring
approach.

------------------------------------------------------------------------

# 20. A Useful Conceptual Promotion Score

A prototype can conceptually combine:

``` text
Promotion Score =
Customer Affinity
+ Inventory Opportunity
+ Demand Potential
+ Margin
+ Historical Promotion Success
+ Regional Relevance
- Inventory Risk
- Profit Risk
```

The exact weights should be justified rather than treated as magic
numbers.

Example:

``` text
Customer affinity       30%
Inventory opportunity  20%
Demand potential        15%
Margin                  15%
Historical success      10%
Regional relevance      10%
```

Then apply hard constraints.

For example:

``` text
If stockout risk is critical:
    do not recommend aggressive promotion
```

------------------------------------------------------------------------

# 21. Why Explainability Is Important

A business manager cannot simply trust:

> "AI says 15% OFF."

They need to know why.

Therefore the system should say:

### Recommendation

**15% OFF Sports T-shirt**

### Why?

-   Customer affinity = high
-   Inventory = high
-   Forecast demand = moderate
-   Margin = healthy
-   Historical promotion = successful

### Risk

Low stockout risk.

### Expected impact

Potentially higher sales and inventory movement.

This is called **explainable AI / explainable decision support**.

------------------------------------------------------------------------

# 22. What If the AI Is Wrong?

This is an important limitation.

Predictions are not guarantees.

Demand forecasting can be wrong because:

-   unexpected events occur
-   customer behavior changes
-   competitors change prices
-   data is incomplete
-   seasonality changes

Therefore the system should present:

> prediction + confidence/risk + explanation

rather than pretending the prediction is certain.

------------------------------------------------------------------------

# 23. What the System Should NOT Do

The system should not:

### ❌ Always promote popular products

Popularity can conflict with inventory.

### ❌ Always give large discounts

Large discounts can destroy margin.

### ❌ Always maximize sales

Sales volume is not the same as profit.

### ❌ Treat all customers equally

Customers have different preferences.

### ❌ Treat all regions equally

Demand varies by region.

### ❌ Automatically trust historical data

Current conditions can change.

### ❌ Use an LLM just because the project says AI

The core decisions should come from structured data, analytical models,
and business logic.

------------------------------------------------------------------------

# 24. Important Trade-Offs

This is a likely judge question.

## Customer Preference vs Inventory

Customer loves product.

But stock is low.

Answer:

> Inventory constraint should prevent aggressive promotion.

------------------------------------------------------------------------

## Sales vs Profit

30% discount increases sales.

But profit decreases.

Answer:

> We should evaluate expected profit, not only sales volume.

------------------------------------------------------------------------

## Demand vs Inventory

High demand + low stock:

> Don't aggressively promote.

Low demand + high stock:

> Promotion may be useful.

------------------------------------------------------------------------

## Personalization vs Business Constraint

Customer strongly wants an item.

But the product is unavailable or unprofitable.

Answer:

> Personalization does not override business constraints.

------------------------------------------------------------------------

# 25. Important Scenarios

Every team member should understand these.

  Situation                         Likely Decision
  --------------------------------- --------------------------------
  High demand + low stock           Don't aggressively promote
  Low demand + high stock           Promotion opportunity
  High affinity + healthy stock     Personalized promotion
  High affinity + low stock         Limited/no promotion
  High discount + negative profit   Reject
  Successful previous promotion     Consider repeating
  Different regional demand         Region-specific recommendation
  No meaningful opportunity         No promotion

------------------------------------------------------------------------

# 26. What Does Success Mean?

The system should ideally improve several business outcomes.

Possible measures:

### Revenue

More sales value.

### Profit

More money after product cost/discount.

### Inventory turnover

Moving products efficiently.

### Stockout reduction

Avoiding situations where demand exceeds supply.

### Promotion ROI

Getting more business value from campaign spending.

### Customer relevance

Showing customers offers they are actually interested in.

------------------------------------------------------------------------

# 27. What Is Synthetic Data?

For a prototype, we may not have real retailer data.

Synthetic data means:

> Artificially generated but realistic data.

Example:

``` text
Customer C001
Product P101
Location Hyderabad
Quantity 2
Price ₹2,000
Discount 10%
```

The important part is that synthetic data should have realistic
relationships.

For example:

Customers who frequently buy sports products should have higher sports
affinity.

Seasonal products should have seasonal demand.

Promotions should affect sales probabilistically.

Some products should be overstocked.

Some should be understocked.

Some promotions should increase sales but reduce profit.

------------------------------------------------------------------------

# 28. What the Prototype Demo Should Communicate

A judge should be able to see:

``` text
DATA
 ↓
CUSTOMER INSIGHT
 ↓
DEMAND
 ↓
INVENTORY
 ↓
PROFITABILITY
 ↓
AI RECOMMENDATION
 ↓
WHY?
 ↓
EXPECTED IMPACT
```

The UI is only the presentation layer.

The important thing is the decision logic behind it.

------------------------------------------------------------------------

# 29. Ideal Recommendation Card

A good output could look like:

``` text
────────────────────────────────────
AI PROMOTION RECOMMENDATION

Product:
Sports T-shirt

Target:
Frequent Sports Customers

Region:
Hyderabad

Offer:
15% OFF

Decision:
🟢 RECOMMEND

WHY?
✓ High customer affinity
✓ High inventory
✓ Moderate forecast demand
✓ Healthy margin
✓ Positive historical promotion

RISK:
Low stockout risk

EXPECTED IMPACT:
Sales: +18%
Inventory: -22%
Profit: Positive

────────────────────────────────────
```

------------------------------------------------------------------------

# 30. Ideal "Do Not Promote" Card

``` text
────────────────────────────────────
AI DECISION

Product:
Running Shoes

Decision:
🔴 DO NOT PROMOTE

WHY?

Customer affinity: HIGH
Inventory: LOW
Forecast demand: HIGH

Risk:
Promotion may cause stockout.

Alternative:
Promote Sports T-shirts instead.

────────────────────────────────────
```

This is a very strong demonstration of business-aware intelligence.

------------------------------------------------------------------------

# 31. Roles for the Five Team Members

## You

Know the entire story.

Deepest understanding:

-   overall problem
-   prototype
-   recommendation logic
-   demo flow

------------------------------------------------------------------------

## Vijay

Deepest understanding:

-   AI/ML
-   data
-   forecasting
-   recommendation scoring
-   model limitations

------------------------------------------------------------------------

## Archana

Deepest understanding:

-   customer behavior
-   segmentation
-   personalization
-   customer-product affinity

------------------------------------------------------------------------

## Suyash

Deepest understanding:

-   inventory
-   demand
-   forecasting
-   stockout
-   overstock

------------------------------------------------------------------------

## Aman

Deepest understanding:

-   promotions
-   discounts
-   margin
-   profit
-   ROI
-   business impact

But everyone should still understand the complete project.

------------------------------------------------------------------------

# 32. Questions Every Team Member Must Be Able to Answer

### Q1. What problem are we solving?

Retailers need to plan promotions while balancing customer preference,
demand, inventory, profitability and campaign effectiveness.

------------------------------------------------------------------------

### Q2. Why isn't a normal recommendation system enough?

Because recommending based only on customer preference can create
inventory shortages or unprofitable promotions.

------------------------------------------------------------------------

### Q3. Why do we need inventory information?

Because promoting a product with insufficient stock can create stockouts
and poor customer experience.

------------------------------------------------------------------------

### Q4. Why do we need demand forecasting?

Because current stock alone does not tell us what will happen next.

------------------------------------------------------------------------

### Q5. Why does margin matter?

A promotion can increase sales but reduce or eliminate profit.

------------------------------------------------------------------------

### Q6. Why do we need promotion history?

It tells us how similar campaigns performed previously.

------------------------------------------------------------------------

### Q7. Why do we need regional demand?

Customer behavior varies by location.

------------------------------------------------------------------------

### Q8. Why should the system be able to say "No"?

Because sometimes not promoting is the best business decision.

------------------------------------------------------------------------

### Q9. Why use AI?

AI/ML can discover customer patterns, predict demand and estimate likely
responses that are difficult to manually analyze across large datasets.

------------------------------------------------------------------------

### Q10. Why use business rules?

Some constraints are explicit business policies, such as avoiding
aggressive promotions when stock is critically low.

------------------------------------------------------------------------

### Q11. What is explainable AI?

Providing understandable reasons behind a recommendation rather than
only producing a score.

------------------------------------------------------------------------

### Q12. What is the biggest innovation?

The combination of personalization with operational and commercial
constraints rather than treating promotion recommendation as a simple
customer-product recommendation problem.

------------------------------------------------------------------------

# 33. The Strongest One-Minute Answer

If a judge says:

> "Explain your project."

Say:

> "Our project is an AI-driven promotion decision-support system for
> retailers. Traditional recommendation systems may recommend products
> based mainly on customer preferences, but that can lead to stockouts
> or unprofitable discounts. Our system combines customer affinity,
> demand forecasts, inventory availability, regional demand, promotion
> history and product margins. Based on these signals, it recommends
> whether to promote, what offer to use, and who should receive it. It
> also explains the recommendation and highlights risks. Importantly,
> the system can recommend 'Do Not Promote' when inventory is low or the
> expected promotion is not profitable."

------------------------------------------------------------------------

# 34. The One Diagram Everyone Should Understand

``` text
                 CUSTOMER
                    │
                    ▼
             Customer Affinity
                    │
                    │
PRODUCT ───────► DEMAND
  │                 │
  │                 │
  ▼                 ▼
MARGIN          INVENTORY
  │                 │
  └────────┬────────┘
           ▼
     PROMOTION ENGINE
           │
           ▼
   ┌───────┼────────┐
   ▼       ▼        ▼
PROMOTE  LIMITED   DON'T
         PROMOTE   PROMOTE
   │       │        │
   └───────┼────────┘
           ▼
       EXPLANATION
           │
           ▼
    EXPECTED IMPACT
           │
           ▼
     MANAGER DECISION
```

If the entire team understands this diagram, they understand the
project.

------------------------------------------------------------------------

# 35. Final Mental Model

Do not remember the project as:

> "We are making an AI discount system."

Remember it as:

> **"We are helping a retailer make a better promotion decision by
> balancing customer relevance, demand, inventory and profitability."**

That is the complete concept.

------------------------------------------------------------------------

# 36. Team Revision Checklist

Before the presentation, every member should be able to explain:

-   [ ] Problem statement
-   [ ] Target user
-   [ ] Customer preference
-   [ ] Customer segmentation
-   [ ] Customer affinity
-   [ ] Demand
-   [ ] Demand forecasting
-   [ ] Inventory
-   [ ] Stockout
-   [ ] Overstock
-   [ ] Margin
-   [ ] Profit
-   [ ] Promotion history
-   [ ] Regional demand
-   [ ] Recommendation engine
-   [ ] Hybrid AI + business rules
-   [ ] Explainability
-   [ ] Why "Do Not Promote" matters
-   [ ] Example recommendation
-   [ ] Example rejection
-   [ ] Business impact
-   [ ] Limitations
-   [ ] What makes the project different from a normal recommendation
    system

------------------------------------------------------------------------

# 37. The Three Things Judges Should Remember

If your presentation is successful, the judge should leave with these
three ideas:

### 1. PERSONALIZATION

> "The system understands who is likely to be interested."

### 2. ALIGNMENT

> "The system checks whether the promotion makes sense with current and
> future inventory."

### 3. PROFITABILITY

> "The system doesn't blindly maximize sales; it considers business
> impact."

Together:

> **Right customer + Right product + Right offer + Right time + Right
> business conditions.**

------------------------------------------------------------------------

# 38. One Sentence to Remember

> **"Don't just ask what the customer wants; ask whether the business
> should promote it right now."**

That is the central idea of the project.
