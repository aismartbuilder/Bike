// Firebase Configuration and Initialization
// Get your config from: https://console.firebase.google.com/
// Project Settings > Your apps > Firebase SDK snippet > Config

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js';

// Firebase project credentials - elevationdestination2026-dev (New Web App)
const firebaseConfig = {
    apiKey: "AIzaSyCa6LwBY2Xt2uBsW7vZCCXdmCs5uEDbWUY",
    authDomain: "elevationdestination2026-dev.firebaseapp.com",
    projectId: "elevationdestination2026-dev",
    storageBucket: "elevationdestination2026-dev.firebasestorage.app",
    messagingSenderId: "702046665920",
    appId: "1:702046665920:web:72b2ff9371d691e20e4125",
    measurementId: "G-R2QC1YRTJL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const firebaseApp = app;
