# NCAA Predictor - Enhanced Calculation Logic

## Overview

The prediction engine uses a **multi-factor weighted algorithm** that combines base statistics with advanced metrics to generate win probabilities and predicted scores.

## Core Formula

```
Team1 Win Probability = 50% (base) + Scoring Factor + Win Rate Factor + Ranking Factor + Advanced Adjustment
Team2 Win Probability = 100% - Team1 Win Probability
```

All factors are bounded to keep probabilities between 5% and 95%.

---

## Base Factors (100% Total Weight)

### 1. Scoring Power Factor (40% Weight)

**Formula:**
```javascript
scoringFactor = (PPG_diff / max_PPG) × 40
```

**Example:**
- Team1 PPG: 85.0
- Team2 PPG: 78.0
- Difference: 7.0
- Max PPG: 85.0
- Factor: (7.0 / 85.0) × 40 = **+3.29%**

**Logic:** Teams that score more points per game have a higher probability of winning. The difference is normalized by the maximum PPG to account for varying scoring levels.

---

### 2. Win Rate Factor (40% Weight)

**Formula:**
```javascript
winRateFactor = (winRate1 - winRate2) × 40
```

**Example:**
- Team1 Win Rate: 0.75 (75%)
- Team2 Win Rate: 0.65 (65%)
- Difference: 0.10
- Factor: 0.10 × 40 = **+4.0%**

**Logic:** Teams with better win-loss records demonstrate consistent performance. This directly reflects season success.

---

### 3. Ranking Factor (20% Weight)

**Formula:**
```javascript
rankingFactor = ((rank2 - rank1) / 355) × 20
```

**Example:**
- Team1 Rank: 15
- Team2 Rank: 45
- Rank Difference: 45 - 15 = 30 (Team1 has better rank)
- Factor: (30 / 355) × 20 = **+1.69%**

**Logic:** Lower rank numbers indicate better teams. The difference is normalized by the total number of teams (355) to scale the impact.

---

## Advanced Metrics Adjustment

The advanced adjustment adds/subtracts from the base probability based on detailed statistics. Each metric contributes a calculated adjustment that is then bounded.

### Calculation Process

1. **Initialize:** `adj = 0`, `metricsUsed = 0`
2. **For each available metric:** Calculate contribution and add to `adj`
3. **Count metrics used:** Track how many metrics are available
4. **Normalize bounds:** More metrics = higher allowed adjustment
5. **Apply bounds:** Limit final adjustment to prevent overpowering base model

### Dynamic Bounds Based on Data Quality

```javascript
if (metricsUsed > 8)  maxAdjustment = 15%
if (metricsUsed > 5)  maxAdjustment = 12%
else                  maxAdjustment = 10%
```

**Logic:** More available statistics = more reliable prediction = allow larger adjustments.

---

## Individual Advanced Metrics

### 1. Effective Field Goal Percentage (eFG%)

**Formula:**
```javascript
adj += (eFG%_team1 - eFG%_team2) × 60
```

**Example:**
- Team1 eFG%: 0.55 (55%)
- Team2 eFG%: 0.50 (50%)
- Difference: 0.05
- Adjustment: 0.05 × 60 = **+3.0%**

**Weight:** 60 (high impact - shooting efficiency is crucial)

**Logic:** eFG% accounts for the extra value of 3-pointers. Higher eFG% = better shooting efficiency.

---

### 2. Turnover Margin

**Formula:**
```javascript
adj += (turnoverMargin_team1 - turnoverMargin_team2) × 1.2
```

**Example:**
- Team1 TO Margin: +3.5
- Team2 TO Margin: +1.0
- Difference: 2.5
- Adjustment: 2.5 × 1.2 = **+3.0%**

**Weight:** 1.2 (moderate impact)

**Logic:** Positive turnover margin means forcing more turnovers than committing. Higher is better.

---

### 3. Turnovers Per Game

**Formula:**
```javascript
adj += (TO_team2 - TO_team1) × 0.6
```

**Example:**
- Team1 TO/G: 11.5
- Team2 TO/G: 14.0
- Difference: 14.0 - 11.5 = 2.5 (Team1 has fewer turnovers)
- Adjustment: 2.5 × 0.6 = **+1.5%**

**Weight:** 0.6 (moderate impact)

**Logic:** Fewer turnovers = better ball security. Lower is better, so we reverse the difference.

---

### 4. Assist/Turnover Ratio

**Formula:**
```javascript
adj += (A/TO_team1 - A/TO_team2) × 4
```

**Example:**
- Team1 A/TO: 1.4
- Team2 A/TO: 1.1
- Difference: 0.3
- Adjustment: 0.3 × 4 = **+1.2%**

**Weight:** 4 (moderate-high impact)

**Logic:** Higher ratio = better offensive efficiency and ball movement.

---

### 5. Offensive Rebounds Per Game

**Formula:**
```javascript
adj += (OReb_team1 - OReb_team2) × 0.9
```

**Example:**
- Team1 OReb/G: 12.5
- Team2 OReb/G: 10.0
- Difference: 2.5
- Adjustment: 2.5 × 0.9 = **+2.25%**

**Weight:** 0.9 (moderate impact)

**Logic:** More offensive rebounds = more second-chance scoring opportunities.

---

### 6. Free Throw Percentage

**Formula:**
```javascript
ftPts1 = FTA_team1 × FT%_team1 × 2
ftPts2 = FTA_team2 × FT%_team2 × 2
adj += (ftPts1 - ftPts2) × 0.2
```

**Example:**
- Team1: 20 FTA/G × 0.75 FT% × 2 = 30 FT points/game
- Team2: 18 FTA/G × 0.70 FT% × 2 = 25.2 FT points/game
- Difference: 4.8 points
- Adjustment: 4.8 × 0.2 = **+0.96%**

**Weight:** 0.2 (moderate impact)

**Logic:** Combines volume (attempts) and efficiency (percentage) to calculate expected free throw points.

---

### 7. Three-Point Volume + Efficiency

**Formula:**
```javascript
made1 = 3PA_team1 × 3P%_team1
made2 = 3PA_team2 × 3P%_team2
pointsDiff = (made1 - made2) × 3
adj += pointsDiff × 0.1
```

**Example:**
- Team1: 25 3PA/G × 0.36 3P% = 9 made/game = 27 points/game
- Team2: 20 3PA/G × 0.33 3P% = 6.6 made/game = 19.8 points/game
- Difference: 7.2 points
- Adjustment: 7.2 × 0.1 = **+0.72%**

**Weight:** 0.1 (moderate impact)

**Logic:** Combines three-point attempts and percentage to calculate expected three-point points.

---

### 8. Three-Point Percentage

**Formula:**
```javascript
adj += (3P%_team1 - 3P%_team2) × 65
```

**Example:**
- Team1 3P%: 0.38 (38%)
- Team2 3P%: 0.32 (32%)
- Difference: 0.06
- Adjustment: 0.06 × 65 = **+3.9%**

**Weight:** 65 (high impact)

**Logic:** Three-point shooting accuracy is a key differentiator in modern basketball.

---

### 9. Three-Point Defense

**Formula:**
```javascript
adj += (3P%_defense_team2 - 3P%_defense_team1) × 45
```

**Example:**
- Team1 allows: 0.32 (32%)
- Team2 allows: 0.35 (35%)
- Difference: 0.35 - 0.32 = 0.03 (Team1 defends better)
- Adjustment: 0.03 × 45 = **+1.35%**

**Weight:** 45 (moderate-high impact)

**Logic:** Lower opponent 3P% = better defense. We reverse the difference so lower is better.

---

### 10. Scoring Defense

**Formula:**
```javascript
adj += (scoringDefense_team2 - scoringDefense_team1) × 0.5
```

**Example:**
- Team1 allows: 68.5 PPG
- Team2 allows: 72.0 PPG
- Difference: 72.0 - 68.5 = 3.5 (Team1 defends better)
- Adjustment: 3.5 × 0.5 = **+1.75%**

**Weight:** 0.5 (moderate impact)

**Logic:** Lower points allowed = better defense. We reverse the difference.

---

### 11. Scoring Margin

**Formula:**
```javascript
adj += (scoringMargin_team1 - scoringMargin_team2) × 0.35
```

**Example:**
- Team1 Margin: +12.5
- Team2 Margin: +8.0
- Difference: 4.5
- Adjustment: 4.5 × 0.35 = **+1.575%**

**Weight:** 0.35 (moderate impact)

**Logic:** Scoring margin (PPG - Opponent PPG) is a strong indicator of overall team strength.

---

### 12. Bench Points

**Formula:**
```javascript
adj += (benchPoints_team1 - benchPoints_team2) × 0.2
```

**Example:**
- Team1 Bench: 25.0 PPG
- Team2 Bench: 20.0 PPG
- Difference: 5.0
- Adjustment: 5.0 × 0.2 = **+1.0%**

**Weight:** 0.2 (moderate impact)

**Logic:** More bench scoring = better depth and ability to maintain performance.

---

### 13. Blocks Per Game

**Formula:**
```javascript
adj += (blocks_team1 - blocks_team2) × 0.7
```

**Example:**
- Team1 Blocks: 4.5/G
- Team2 Blocks: 3.0/G
- Difference: 1.5
- Adjustment: 1.5 × 0.7 = **+1.05%**

**Weight:** 0.7 (moderate impact)

**Logic:** More blocks = better rim protection and defensive presence.

---

### 14. Steals Per Game

**Formula:**
```javascript
adj += (steals_team1 - steals_team2) × 0.7
```

**Example:**
- Team1 Steals: 7.5/G
- Team2 Steals: 6.0/G
- Difference: 1.5
- Adjustment: 1.5 × 0.7 = **+1.05%**

**Weight:** 0.7 (moderate impact)

**Logic:** More steals = better defensive pressure and transition opportunities.

---

## Final Calculation Example

### Input Data
**Team1:**
- PPG: 85.0
- Win Rate: 0.75
- Rank: 15
- eFG%: 0.55
- TO Margin: +3.5
- 3P%: 0.38
- Scoring Defense: 68.5

**Team2:**
- PPG: 78.0
- Win Rate: 0.65
- Rank: 45
- eFG%: 0.50
- TO Margin: +1.0
- 3P%: 0.32
- Scoring Defense: 72.0

### Step-by-Step Calculation

1. **Scoring Factor:**
   - (85.0 - 78.0) / 85.0 × 40 = **+3.29%**

2. **Win Rate Factor:**
   - (0.75 - 0.65) × 40 = **+4.0%**

3. **Ranking Factor:**
   - (45 - 15) / 355 × 20 = **+1.69%**

4. **Advanced Adjustment:**
   - eFG%: (0.55 - 0.50) × 60 = +3.0%
   - TO Margin: (3.5 - 1.0) × 1.2 = +3.0%
   - 3P%: (0.38 - 0.32) × 65 = +3.9%
   - Scoring Defense: (72.0 - 68.5) × 0.5 = +1.75%
   - Subtotal: +11.65%
   - Bounded to max (8+ metrics): **+15.0%**

5. **Total Probability:**
   - Base: 50%
   - Factors: 3.29 + 4.0 + 1.69 + 15.0 = +23.98%
   - **Team1 Win Probability: 73.98%**
   - **Team2 Win Probability: 26.02%**

---

## Predicted Score Calculation

**Formula:**
```javascript
predictedScore = PPG - ((opponentProbability - 50) × 0.15)
```

**Example:**
- Team1 PPG: 85.0
- Team2 Win Probability: 26.02%
- Adjustment: (26.02 - 50) × 0.15 = -3.597
- **Team1 Predicted Score: 85.0 - (-3.597) = 88.6 → 89 points**

**Logic:** If opponent has low win probability, this team scores closer to their average. If opponent is strong, score is reduced.

**Bounds:** Scores are clamped between 40 and 120 points.

---

## Confidence Levels

Based on probability difference:

```javascript
if (diff >= 30)  return 'Very High'
if (diff >= 20)  return 'High'
if (diff >= 10)  return 'Medium'
if (diff >= 5)   return 'Low'
return 'Very Low'
```

---

## Key Design Principles

1. **Base Model First:** Core factors (scoring, win rate, ranking) provide 100% of base prediction
2. **Advanced Metrics Enhance:** Additional stats adjust the prediction, not replace it
3. **Bounded Adjustments:** Advanced metrics can't overpower the base model
4. **Data Quality Aware:** More metrics = higher confidence = larger allowed adjustments
5. **Normalized Values:** All differences are normalized to prevent scale issues
6. **Reasonable Bounds:** Probabilities (5-95%), Scores (40-120), Adjustments (dynamic max)

---

## Why This Approach Works

- **Balanced:** No single metric dominates
- **Adaptive:** Works with minimal or extensive data
- **Transparent:** Each factor's contribution is calculable
- **Realistic:** Bounds prevent unrealistic predictions
- **Comprehensive:** Utilizes all available statistics from your Data folder

