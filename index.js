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

app.use(cors()); // Using default CORS without specifying origins

app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.status(200).send("Hello from Lively Campus");
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

// Update event details (Add notification for updates)
app.put("/events/:eventId", async (req, res) => {
  try {
    const {title, description, date, location, imageUrl} = req.body;

    const updateData = {};
    const changes = [];

    if (title) {
      updateData.title = title;
      changes.push(`Title updated to ${title}`);
    }
    if (description) {
      updateData.description = description;
      changes.push("Description updated");
    }
    if (date) {
      updateData.date = date;
      changes.push(`Date updated to ${date}`);
    }
    if (location) {
      updateData.location = location;
      changes.push(`Location updated to ${location}`);
    }
    if (imageUrl) {
      updateData.imageUrl = imageUrl;
      changes.push("Image updated");
    }

    await admin.firestore().collection("events").doc(req.params.eventId).update(updateData);

    // Add notification for event update
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

// Export the API to firebase cloud functions (Unchanged)
exports.app = functions.https.onRequest(app);
