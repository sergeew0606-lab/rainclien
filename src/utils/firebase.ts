import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCKk1-jI0CuqE48ZB1-CgYoL4wK_A5N8DU",
  authDomain: "rainclient.firebaseapp.com",
  databaseURL: "https://rainclient-default-rtdb.firebaseio.com",
  projectId: "rainclient",
  storageBucket: "rainclient.firebasestorage.app",
  messagingSenderId: "857605108777",
  appId: "1:857605108777:web:890e8df2a4070857d75838",
  measurementId: "G-2Z10Z91HWD"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
