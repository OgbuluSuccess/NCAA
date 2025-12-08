# NCAA Basketball Predictor

A comprehensive web application for predicting NCAA Division I men's basketball game outcomes using advanced statistical analysis. The application analyzes team performance metrics and generates predictions with confidence levels.

## Features

- **Multi-File Data Import**: Upload single Excel files or entire folders of statistics
- **Advanced Statistical Analysis**: Uses weighted algorithms combining scoring power, win history, rankings, and advanced metrics
- **AI-Powered Prediction**: Upload screenshots of team data - AI reads the image and uses v2.0 model for predictions
- **Dual Model Comparison**: Compare AI (v2.0) predictions with local enhanced model predictions
- **Comprehensive Team Comparison**: Side-by-side comparison of team statistics
- **Detailed Predictions**: Win probabilities, predicted scores, and confidence levels
- **Modern UI**: Clean, responsive interface with NCAA-themed styling

## Data Requirements

The application works with Excel files (`.xlsx` or `.xls`) containing NCAA team statistics. The system supports:

### Base File (Required)
- **Scoring Offense.xlsx** - Contains team names, rankings, and points per game
  - Columns: Rank, Team, PPG (or Scoring Offense), W-L, Conference

### Additional Statistics Files (Optional but Recommended)
The following files enhance prediction accuracy:

- **Scoring Defense.xlsx** - Points allowed per game
- **Free Throw Percentage.xlsx** - Free throw shooting accuracy
- **Free Throw Attempts Per Game.xlsx** - Free throw volume
- **Three Point Percentage.xlsx** - Three-point shooting accuracy
- **Three Point Percentage Defense.xlsx** - Opponent three-point defense
- **Three Point Attempts Per Game.xlsx** - Three-point volume
- **Turnovers Per Game.xlsx** - Ball security metrics
- **Rebounds (Offensive) Per Game.xlsx** - Second chance opportunities

### File Format
- First row should contain column headers
- Required columns: **Team** (or School), **Rank** (optional but recommended)
- Team names should be consistent across files for proper merging
- W-L format: "28-9" (wins-losses)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd NCAAPredictor
```

2. Install dependencies:
```bash
npm install
```

3. Set up OpenAI API Key (for AI-Powered Prediction feature):
   - Copy `.env.example` to `.env`
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Add your key to `.env`:
   ```
   VITE_OPENAI_API_KEY=your_api_key_here
   ```
   - **Note**: The AI feature requires a valid OpenAI API key. The main predictor works without it.

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:5173`

## Usage

### Method 1: Traditional Predictor (Excel Files)

1. **Single File Upload**: Click "Choose File" and select an Excel file with team statistics
2. **Folder Upload**: Click "Select Folder" to automatically import all Excel files from a folder
   - Recommended: Select the `Data` folder containing all statistics files
   - The system will automatically merge data by team name

3. **Making Predictions**:
   - After data is loaded, select two teams from the dropdown menus
   - Click "Predict Match" to generate predictions
   - View detailed results including:
     - Win probabilities for each team
     - Predicted final score
     - Predicted first half score
     - Point margin
     - Key factors influencing the prediction
     - Advanced metrics comparison

### Method 2: AI-Powered Prediction (Screenshot Upload)

1. Click **"Try AI-Powered Prediction"** button on the main page
2. **Upload Screenshot**: 
   - Take a screenshot of team statistics (from any source)
   - Click the upload area and select your image file
   - Supported formats: PNG, JPG, etc.
3. **Analyze with AI**:
   - Click "Analyze with AI" button
   - The AI will read the image and extract team data
   - Uses ChatGPT's latest vision model (gpt-4o)
4. **View Results**:
   - **AI Prediction (v2.0 Model)**: Uses the exact v2.0 specification model
   - **Local Prediction**: Uses the enhanced local prediction engine
   - **Comparison**: See how both models compare side-by-side

**Note**: The AI feature requires an OpenAI API key. Set `VITE_OPENAI_API_KEY` in your `.env` file.

## Prediction Algorithm

The prediction engine uses a weighted scoring system:

### Base Factors (100% total)
- **Scoring Power (40%)**: Based on points per game differential
- **Win History (40%)**: Based on season win rate
- **National Ranking (20%)**: Based on current ranking (lower rank = better)

### Advanced Metrics Adjustment
Additional metrics provide adjustments to the base prediction:
- Effective Field Goal Percentage (eFG%)
- Turnover Margin and Turnovers Per Game
- Assist/Turnover Ratio
- Offensive Rebounds Per Game
- Free Throw Percentage and Attempts
- Three-Point Percentage and Attempts
- Three-Point Defense
- Scoring Defense
- Scoring Margin
- Bench Points
- Blocks and Steals Per Game

The more statistics available, the more accurate the prediction becomes.

### Confidence Levels
- **Very High**: 75%+ probability difference
- **High**: 65-74% probability difference
- **Medium**: 55-64% probability difference
- **Low**: 50-54% probability difference

## Project Structure

```
NCAAPredictor/
├── src/
│   ├── components/
│   │   ├── FileUploadSection.jsx      # File upload interface
│   │   ├── TeamSelectionSection.jsx     # Team selection dropdowns
│   │   ├── PredictionResults.jsx      # Results display
│   │   ├── TeamComparisonCard.jsx      # Individual team cards
│   │   ├── WinnerBanner.jsx            # Winner announcement
│   │   └── MethodologyInfo.jsx        # Algorithm explanation
│   ├── utils/
│   │   ├── excelParser.js              # Excel file parsing and merging
│   │   ├── predictionEngine.js         # Prediction algorithm
│   │   └── teamDataManager.js          # Team data utilities
│   ├── App.jsx                         # Main application component
│   └── main.jsx                        # Application entry point
├── Data/                               # Statistics files folder
│   ├── Scoring Offense.xlsx
│   ├── Scoring Defense.xlsx
│   └── ... (other statistics files)
└── package.json
```

## Technologies Used

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **XLSX** - Excel file parsing
- **React Select** - Enhanced dropdowns
- **Lucide React** - Icons

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Statistics

To add support for new statistics:

1. Add the metric to the `metrics` array in `src/utils/excelParser.js`
2. Add the metric calculation to `calculateAdvancedAdjustment()` in `src/utils/predictionEngine.js`
3. Update `PredictionResults.jsx` to display the new metric if desired

## Data Sources

- NCAA Division I Men's Basketball Statistics
- All 355 Division I teams included
- 2024-25 Season Data

## Notes

- Predictions are based on statistical analysis and should be used for entertainment purposes
- Actual game outcomes may vary due to factors not captured in statistics (injuries, team chemistry, game-day performance)
- Team name matching is case-insensitive and handles common variations
- The system automatically normalizes team names across files for proper merging

## License

This project is for personal/educational use.

## Contributing

Feel free to submit issues or pull requests for improvements.
