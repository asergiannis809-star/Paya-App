# Paya

Track every subscription and bill, and never miss a renewal.

An Expo (SDK 58) app with Expo Router, Firebase Authentication and Cloud Firestore.

## Features

- **Home**: this month's total compared with last month, upcoming payments, and spend by category
- **Subscriptions**: search, filter by category, sort by date or price, add, edit and delete
- **Calendar**: month view with every payment date
- **Settings**: default currency, language (English / Ελληνικά), renewal reminders, dark mode, CSV export
- **Reminders**: local notifications before each renewal (Android and iOS)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the Firebase values
   (Firebase console → Project settings → Your apps → Web app).

3. Start the dev server and open the app in Expo Go (scan the QR code), or press `w` for web:

   ```bash
   npx expo start
   ```

## Project structure

| Folder | Contents |
| --- | --- |
| `app/` | Screens and navigation (Expo Router) |
| `components/` | Shared UI components |
| `context/` | Auth, theme and language providers |
| `hooks/` | Data hooks (subscriptions, settings, reminders) |
| `i18n/` | English and Greek translations |
| `utils/` | Date maths, formatting, CSV export, reminder scheduling |
| `constants/` | Light and dark colour palettes |
