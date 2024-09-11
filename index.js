/* eslint-disable linebreak-style */
/* eslint-disable camelcase */
/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const serviceAccount = require("./permissions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const express = require("express");
const app = express();

const cors = require("cors");

app.use(cors({origin: true}));

app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.status(200).send("Hello from Lively Campus");
});

const envVarCorsOptions = {
  origin: [
    "https://*.witslivelycampus.web.app",
    "http://localhost:3000",
    "https://witslivelycampus--pr12-viewmoredetails-dd5q9cvi.web.app",
  ],
};

// Environment variable retrieval
app.get("/getEnvVar", cors(envVarCorsOptions), (req, res) => {
  const allowedOrigins = ["https://witslivelycampus.web.app", "http://localhost:3000", "https://witslivelycampus--pr12-viewmoredetails-dd5q9cvi.web.app"];
  const origin = req.get("origin");

  if (allowedOrigins.includes(origin)) {
    const firebaseApiKey = process.env.REACT_APP_FIREBASE_API_KEY;
    res.status(200).json({value: firebaseApiKey});
  } else {
    res.status(403).json({error: "Forbidden"});
  }
});

app.get("/getEnvgoogle", cors(envVarCorsOptions), (req, res) => {
  const allowedOrigins = ["https://witslivelycampus.web.app", "http://localhost:3000", "https://witslivelycampus--pr12-viewmoredetails-dd5q9cvi.web.app"];
  const origin = req.get("origin");

  if (allowedOrigins.includes(origin)) {
    const googleKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    res.status(200).json({value: googleKey});
  } else {
    res.status(403).json({error: "Forbidden"});
  }
});

app.get("/hello-world", (req, res) => {
  res.status(200).send("Hello World from Lively Campus");
});

// Create a new event (Backwards Compatible)
app.post("/events", async (req, res) => {
  try {
    const {
      organizerId,
      title,
      description,
      ticketPrice,
      capacity,
      availableTickets,
      date,
      time,
      imageUrl,
      tags,
      venue,
      likes,
      comments,
    } = req.body;

    const eventRef = await admin.firestore().collection("events").add({
      organizerId,
      title,
      description,
      ticketPrice,
      capacity,
      availableTickets,
      date,
      time,
      imageUrl, // Ensure imageUrl is still included
      tags,
      venue,
      likes,
      comments,
    });

    // Add notification for new event
    await admin.firestore().collection("notifications").add({
      eventId: eventRef.id,
      message: `New event created: ${title}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(201).json({id: eventRef.id, message: "Event created successfully"});
  } catch (error) {
    res.status(500).json({error: "Failed to create event"});
  }
});

// Retrieve all events (Unchanged)
app.get("/events", async (req, res) => {
  try {
    const eventsSnapshot = await admin.firestore().collection("events").get();
    const events = eventsSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({error: "Failed to retrieve events"});
  }
});

// Get details of a specific event (Unchanged)
app.get("/events/:eventId", async (req, res) => {
  try {
    const eventDoc = await admin.firestore().collection("events").doc(req.params.eventId).get();
    if (!eventDoc.exists) {
      res.status(404).json({error: "Event not found"});
    } else {
      res.status(200).json({id: eventDoc.id, ...eventDoc.data()});
    }
  } catch (error) {
    res.status(500).json({error: "Failed to retrieve event"});
  }
});

// Update event details (No likes logic here)
app.put("/events/:eventId", async (req, res) => {
  try {
    const {title, description, date, location, imageUrl} = req.body;

    const updateData = {};
    const changes = [];

    if (title) {
      updateData.title = title;
      changes.push(`Title updated to ${title}\n`);
    }
    if (description) {
      updateData.description = description;
      changes.push("Description updated\n");
    }
    if (date) {
      updateData.date = date;
      changes.push(`Date updated to ${date}\n`);
    }
    if (location) {
      updateData.location = location;
      changes.push(`Location updated to ${location}\n`);
    }
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
      changes.push("Image updated\n");
    }

    // Update event in Firestore
    await admin.firestore().collection("events").doc(req.params.eventId).update(updateData);

    // Add notification for event update if there are changes
    if (changes.length > 0) {
      await admin.firestore().collection("notifications").add({
        eventId: req.params.eventId,
        message: `Event updated: ${changes.join(", ")}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.status(200).json({message: "Event updated successfully"});
  } catch (error) {
    res.status(500).json({error: "Failed to update event"});
  }
});

// Delete an event (Unchanged)
app.delete("/events/:eventId", async (req, res) => {
  try {
    const eventDoc = await admin.firestore().collection("events").doc(req.params.eventId).get();

    if (eventDoc.exists) {
      const {title} = eventDoc.data();

      await admin.firestore().collection("events").doc(req.params.eventId).delete();

      // Create notification for event deletion
      await admin.firestore().collection("notifications").add({
        eventId: req.params.eventId,
        message: `Event deleted: ${title}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(204).send();
    } else {
      res.status(404).json({error: "Event not found"});
    }
  } catch (error) {
    res.status(500).json({error: "Failed to delete event"});
  }
});

// Get notifications (Unchanged)
app.get("/notifications", async (req, res) => {
  try {
    const notificationsSnapshot = await admin.firestore().collection("notifications").get();
    const notifications = notificationsSnapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({error: "Failed to retrieve notifications"});
  }
});

// User-related routes (Unchanged)
app.get("/verifyUserEmail", async (req, res) => {
  const {email} = req.query;

  if (!email) {
    return res.status(400).json({message: "Email parameter is required"});
  }

  try {
    const usersRef = admin.firestore().collection("users");
    const snapshot = await usersRef.where("Email", "==", email).get();

    if (snapshot.empty) {
      return res.status(404).json({message: "User does not exist"});
    }

    const userData = snapshot.docs.map((doc) => doc.data());
    return res.status(200).json(userData);
  } catch (error) {
    return res.status(500).json({message: "Internal Server Error"});
  }
});

app.post("/users", async (req, res) => {
  try {
    const {
      UserID,
      FirstName,
      LastName,
      profile_picture,
      Email,
    } = req.body;

    const userRef = admin.firestore().collection("users").doc(UserID);

    await userRef.set({
      FirstName,
      LastName,
      profile_picture,
      Email,
    });

    res.status(201).json({id: UserID, message: "User created successfully"});
  } catch (error) {
    res.status(500).json({error: "Failed to create user"});
  }
});


app.get("/users/:UserID", async (req, res) => {
  try {
    const {UserID} = req.params;

    const userRef = admin.firestore().collection("users").doc(UserID);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({error: "User not found"});
    }

    const userData = doc.data();
    res.status(200).json({id: UserID, ...userData});
  } catch (error) {
    res.status(500).json({error: "Failed to fetch user"});
  }
});

app.put("/users/:userId/liked-events", async (req, res) => {
  try {
    // Extract likedEvents from the request body
    const {likedEvents} = req.body;

    // Ensure likedEvents is an array
    if (!Array.isArray(likedEvents)) {
      return res.status(400).json({error: "likedEvents must be an array"});
    }

    // Object to hold the update data
    const updateData = {};
    const changes = []; // Track changes

    // Check if likedEvents is provided
    if (likedEvents) {
      updateData.likedEvents = likedEvents;
      changes.push("Liked events updated");
    }

    // Reference the user's document in Firestore
    const userRef = admin.firestore().collection("users").doc(req.params.userId);
    const userSnapshot = await userRef.get();

    // Check if the user exists in the database
    if (!userSnapshot.exists) {
      return res.status(404).json({error: "User not found"});
    }

    // Update the user's likedEvents in Firestore
    await userRef.update(updateData);

    // Send a response if the update was successful
    res.status(200).json({message: `User's liked events updated successfully: ${changes.join(", ")}`});
  } catch (error) {
    // Error handling
    res.status(500).json({error: "Failed to update user's liked events"});
  }
});


// set the attendies to attendies + 1 in eventId
app.post("/incrementAttendes", async (req, res) => {
  const {eventId} = req.body;

  try {
    const eventRef = admin.firestore().collection("events").doc(eventId);

    const eventSnapshot = await eventRef.get();

    if (!eventSnapshot.exists) {
      res.status(404).send("Event not found");
      return;
    }

    const attendeesRef = eventRef.collection("attendees").doc("attendees");

    const attendeesSnapshot = await attendeesRef.get();
    const attendeesData = attendeesSnapshot.data() || {attendes: 0};

    const updatedAttendeesCount = (attendeesData.attendes || 0) + 1;

    await attendeesRef.set({attendes: updatedAttendeesCount});

    console.log(`Updated attendees for event ID: ${eventId}`);

    res.status(200).send("Attendances updated successfully.");
  } catch (error) {
    console.error("Error updating attendances:", error);
    res.status(500).send("Internal Server Error");
  }
});


app.post("/incrementTicketSales", async (req, res) => {
  const {eventId} = req.body;

  try {
    const eventRef = admin.firestore().collection("events").doc(eventId);

    const eventSnapshot = await eventRef.get();

    if (!eventSnapshot.exists) {
      res.status(404).send("Event not found");
      return;
    }

    const attendeesRef = eventRef.collection("ticketSales").doc("ticketSales");

    const attendeesSnapshot = await attendeesRef.get();
    const attendeesData = attendeesSnapshot.data() || {attendes: 0};

    const updatedAttendeesCount = (attendeesData.attendes || 0) + 1;

    await attendeesRef.set({attendes: updatedAttendeesCount});

    console.log(`Updated ticket sales for event ID: ${eventId}`);

    res.status(200).send("tickesSales updated successfully.");
  } catch (error) {
    console.error("Error updating attendances:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Like an event
app.post("/like", async (req, res) => {
  const {userId, eventId} = req.body;

  try {
    // Reference the user's document in Firestore
    const userRef = admin.firestore().collection("users").doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return res.status(404).json({error: "User not found"});
    }

    // Retrieve current liked events
    const userData = userSnapshot.data();
    const likedEvents = userData.likedEvents || [];

    // Check if the event is already liked
    if (!likedEvents.includes(eventId)) {
      likedEvents.push(eventId);

      // Update the user's likedEvents in Firestore
      await userRef.update({likedEvents});

      // Increment the event's like count
      const eventRef = admin.firestore().collection("events").doc(eventId);
      await eventRef.update({
        likes: admin.firestore.FieldValue.increment(1),
      });

      res.status(200).json({message: "Event liked successfully"});
    } else {
      res.status(400).json({message: "Event is already liked"});
    }
  } catch (error) {
    res.status(500).json({error: "Failed to like event"});
  }
});

// Unlike an event
app.post("/unlike", async (req, res) => {
  const {userId, eventId} = req.body;

  try {
    // Reference the user's document in Firestore
    const userRef = admin.firestore().collection("users").doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      return res.status(404).json({error: "User not found"});
    }

    // Retrieve current liked events
    let likedEvents = userSnapshot.data().likedEvents || [];

    // Check if the event is in the liked list
    if (likedEvents.includes(eventId)) {
      likedEvents = likedEvents.filter((id) => id !== eventId);

      // Update the user's likedEvents in Firestore
      await userRef.update({likedEvents});

      // Decrement the event's like count
      const eventRef = admin.firestore().collection("events").doc(eventId);
      await eventRef.update({
        likes: admin.firestore.FieldValue.increment(-1),
      });

      res.status(200).json({message: "Event unliked successfully"});
    } else {
      res.status(400).json({message: "Event is not liked"});
    }
  } catch (error) {
    res.status(500).json({error: "Failed to unlike event"});
  }
});


// Export the API to firebase cloud functions (Unchanged)
exports.app = functions.https.onRequest(app);
