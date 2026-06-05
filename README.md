# Tiendi — Retail Shelf Inventory (Prototype)

Tiendi is a mobile app prototype (React Native + Expo) designed to help small retail stores manage inventory on shelving units and points of sale. This version is a proof of concept that allows store staff to scan products, view basic product information, and adjust stock quantities — before integrating with a full POS system.

---

## Goal

- Solve the problem of fast in-store inventory management (stock tracking and adjustment).
- Serve as an MVP to demonstrate viability and reduce costs compared to hiring a full POS provider integration.

---

## Core Features (Prototype)

- Product scanning / search.
- Product modal with key details (price, stock, supplier, unit).
- Quantity adjustment with temporary local storage.
- Interface optimized for Android devices (test APK available).

---

## Tech Stack

- **Frontend**: React Native + Expo
- **App Routing**: Expo Router (file-based routing)
- **Language**: TypeScript

---

## Repository Structure

```
├── app/          # App source code (screens and routes)
├── assets/       # Icons and static resources
├── android/      # Native configuration and Gradle (Android builds)
├── package.json
├── tsconfig.json
└── eas.json      # EAS Build configuration
```

---

## Installation & Development

1. Clone the repository:
   ```bash
   git clone <repo_url>
   cd Tiendi
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npx expo start
   ```

4. To test on an Android emulator or physical device, use the options shown by `expo start` (Dev build / emulator / limited Expo Go). To generate a test APK, use EAS Build or Android Studio with `gradlew`.

---

## Building an APK

**Recommended — EAS Build:**
```bash
eas build --platform android
```
Requires configuring `eas.json` and signing credentials.

**Alternative — Android Studio:**
Open the `android/` folder in Android Studio and build the APK directly.

---

## Important Technical Notes

- The product modal (`app/(tienda)/(Gondola)/suplir-productos.tsx`) had behavioral issues on native Android builds — particularly around keyboard handling and the navigation bar. If you are producing builds for production, review the keyboard/UI behavior and test thoroughly on real devices before releasing.
