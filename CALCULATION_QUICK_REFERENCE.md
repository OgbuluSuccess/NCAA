# Enhanced Calculation - Quick Reference

## Core Formula

```
Win Probability = 50% + Scoring(40%) + WinRate(40%) + Ranking(20%) + Advanced Metrics
```

## Base Factors

| Factor | Weight | Formula | Example |
|--------|--------|---------|---------|
| **Scoring Power** | 40% | `(PPG_diff / max_PPG) × 40` | Team1: 85 PPG, Team2: 78 PPG → +3.29% |
| **Win Rate** | 40% | `(winRate_diff) × 40` | Team1: 75%, Team2: 65% → +4.0% |
| **Ranking** | 20% | `((rank2 - rank1) / 355) × 20` | Team1: #15, Team2: #45 → +1.69% |

## Advanced Metrics (Bounded Adjustment)

### High Impact Metrics (Weight 45-65)
- **eFG%**: `diff × 60` - Shooting efficiency
- **3P%**: `diff × 65` - Three-point accuracy
- **3P% Defense**: `diff × 45` - Opponent three-point defense

### Moderate Impact Metrics (Weight 0.5-4.0)
- **Turnover Margin**: `diff × 1.2` - Ball control
- **A/TO Ratio**: `diff × 4.0` - Offensive efficiency
- **Scoring Defense**: `diff × 0.5` - Points allowed
- **Scoring Margin**: `diff × 0.35` - Overall strength
- **Offensive Rebounds**: `diff × 0.9` - Second chances
- **Turnovers/G**: `diff × 0.6` - Ball security
- **Blocks/G**: `diff × 0.7` - Rim protection
- **Steals/G**: `diff × 0.7` - Defensive pressure

### Lower Impact Metrics (Weight 0.1-0.2)
- **Free Throw Points**: `(FTA × FT% × 2) diff × 0.2` - FT efficiency
- **3P Points**: `(3PA × 3P% × 3) diff × 0.1` - Three-point impact
- **Bench Points**: `diff × 0.2` - Team depth

## Dynamic Bounds

The advanced adjustment is bounded based on data quality:

```
Metrics Used > 8:  max ±15% adjustment
Metrics Used > 5:  max ±12% adjustment
Metrics Used ≤ 5:  max ±10% adjustment
```

## Final Bounds

- **Win Probability**: 5% - 95%
- **Predicted Score**: 40 - 120 points
- **Advanced Adjustment**: ±10% to ±15% (depending on data)

## Example Calculation

**Input:**
- Team1: 85 PPG, 75% win rate, Rank #15, 55% eFG%, 38% 3P%
- Team2: 78 PPG, 65% win rate, Rank #45, 50% eFG%, 32% 3P%

**Calculation:**
1. Scoring: (7/85) × 40 = +3.29%
2. Win Rate: (0.10) × 40 = +4.0%
3. Ranking: (30/355) × 20 = +1.69%
4. Advanced: eFG% (+3.0%) + 3P% (+3.9%) = +6.9% (bounded to +15%)
5. **Total: 50 + 3.29 + 4.0 + 1.69 + 6.9 = 65.88%**

**Result:** Team1 has 65.88% win probability

## Key Files

- **PREDICTION_LOGIC.md** - Detailed explanation with examples
- **src/utils/predictionEngine.js** - Implementation code
- **README.md** - General project documentation

