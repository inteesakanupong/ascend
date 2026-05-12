# Ascend

Ascend is a local-first fitness planning app for training, nutrition, recovery, and bodyweight tracking. It is built as a single-page static web app and is designed to deploy cleanly through GitHub to Cloudflare Pages.

## What It Does

- Builds exercise programs from trainee context, experience, lifestyle, recovery, activity level, body fat estimate, and lifting goals.
- Lets the lifter restart an exercise program without deleting prior logs, records, custom foods, or custom exercises.
- Lets the lifter restart a diet phase without deleting food history, weigh-ins, meals, or records.
- Uses estimated 1RM inputs to create 90% training maxes for program progression.
- Tracks sessions, working maxes, RPE, recovery, bodyweight, calories, protein, carbs, fat, and custom foods.
- Keeps data local in the browser unless future backend sync is added.

## Project Structure

```txt
index.html
ppal_training_reference_database.json
ppal_training_reference_notes.md
README.md
```

The app currently lives mostly in `index.html`.

## Run Locally

Open `index.html` directly in a browser, or serve the folder with any simple static server.

Example with Python:

```bash
python -m http.server 8080
```

Then open:

```txt
http://localhost:8080
```

## Deploy

This repo is intended for:

```txt
GitHub -> Cloudflare Pages
```

Recommended Cloudflare Pages settings for the current static app:

```txt
Framework preset: None
Build command: exit 0
Build output directory: .
Root directory: /
Production branch: main
```

Do not use `npx wrangler deploy` as the Pages deploy command for this static setup.

## Current App Name

The app is named **Ascend**.

## Notes

The training reference files are included as project research/context and should stay in the repo unless the app later moves them into a backend or generated data pipeline.
