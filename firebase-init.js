// IMPORTANT: Replace this with your actual Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBDXyP3Coh9-Di-qy_nK7Rpui7GAffi2ks",
    authDomain: "abiding-cedar-332406.firebaseapp.com",
    projectId: "abiding-cedar-332406",
    storageBucket: "abiding-cedar-332406.firebasestorage.app",
    messagingSenderId: "650000327388",
    appId: "1:650000327388:web:af3e228474868535bbca19",
    measurementId: "G-L70TMQHX59"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); // Initialize Cloud Firestore