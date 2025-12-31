const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const session = require("express-session");
const Admin = require("../model/adminSchema");

// MongoDB connection string (ensure this is stored securely in environment variables in production)
const db = "mongodb+srv://kovuru_lakshmaiah:Lakshmaiah123@cluster0.dv3qq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Admin credentials to insert (hardcoded for now)
const adminEmail = "admin@example.com";
const adminPassword = "adminpassword";  // Change this to your desired password

// Middleware to check if admin is logged in
const requireAdminLogin = async (req, res, next) => {
  try {
    if (req.session.isAdminLoggedIn) {
      // Admin is authenticated, proceed to the next middleware/route handler
      next();
    } else {
      // Admin is not logged in, respond with Unauthorized status
      res.status(401).send({ success: false, message: 'Unauthorized access' });
    }
  } catch (error) {
    console.error("Error in requireAdminLogin middleware:", error);
    res.status(500).send({ success: false, message: "Server error" });
  }
};

// Admin login route
router.post("/adminlogin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).send({ success: false, message: "Email and password are required" });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(422).send({
        success: false,
        message: "Email not registered. Please register first."
      });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(422).send({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Set session variable if login is successful
    req.session.isAdminLoggedIn = true;
    req.session.adminId = admin._id;  // Store admin id in the session for further use
    req.session.email = admin.email;  // Store admin email in the session

    // Respond with success message
    res.status(200).send({
      success: true,
      message: "Login successful",
      user: { email: admin.email }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send({ success: false, message: `Login error: ${err.message}` });
  }
});

// Admin authentication check (route only accessible if admin is logged in)
router.get('/admin-auth', requireAdminLogin, (req, res) => {
  res.status(200).send({ success: true, message: "Admin authenticated", adminEmail: req.session.email });
});

// Logout route to destroy session
router.post('/admin-logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send({ success: false, message: "Logout failed" });
    }
    res.status(200).send({ success: true, message: "Logged out successfully" });
  });
});

// Insert the admin user manually if it doesn't exist
const createAdminIfNotExists = async () => {
  try {
    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });

    if (!existingAdmin) {
      // If not, hash the password and create a new admin
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const newAdmin = new Admin({
        email: adminEmail,
        password: hashedPassword,
      });

      await newAdmin.save();
      console.log("Admin created successfully.");
    } else {
      console.log("Admin already exists.");
    }
  } catch (err) {
    console.error("Error inserting admin:", err);
  }
};

// Run the function to create admin on server startup
createAdminIfNotExists();

module.exports = router;
