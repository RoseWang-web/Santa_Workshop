git add .# Santa's Workshop Tracker

This is a Next.js application built with Firebase to help Santa's elves track children and their Christmas gifts. It features real-time data synchronization with Firestore, AI-powered gift suggestions, and a festive, user-friendly interface.

## Getting Started

### 1. Set up Firebase

1.  Create a new Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
2.  In your project, go to **Project settings** > **General**.
3.  Under "Your apps", click the **Web** icon (`</>`) to add a new web app.
4.  Give your app a nickname and register the app.
5.  You will be given a `firebaseConfig` object. You will need these values for the next step.
6.  Go to the **Firestore Database** section in the Firebase console and create a new database in **Production mode**. Choose a location near your users.

### 2. Configure Environment Variables

1.  Rename the `.env.local.example` file in the root directory to `.env.local`.
2.  Copy the values from your Firebase project's `firebaseConfig` object into the corresponding variables in `.env.local`.

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Install Dependencies and Run the App

First, install the project dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

### 4. Firestore Security Rules

The project includes a `firestore.rules` file with basic security rules to allow access only to authenticated users. To use these, you would need to implement Firebase Authentication.

To deploy these rules:
1. You can copy the contents of `firestore.rules` into the **Rules** tab of your Firestore Database in the Firebase console.
2. Or, use the Firebase CLI to deploy them.

```bash
firebase deploy --only firestore:rules
```

## Useful Websites to Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)

## Future Work

- Styling this app so it has more Christmas feel
- Meking the notification comes with an little animation