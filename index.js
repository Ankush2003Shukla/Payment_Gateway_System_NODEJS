const express = require("express");
const paypal = require("paypal-rest-sdk");
const bodyParser = require("body-parser");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PayPal configuration
paypal.configure({
  mode: process.env.PAYPAL_MODE, // Sandbox or live
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

// Pay route
app.post("/pay", (req, res) => {
  const { item, price } = req.body;
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: `${req.protocol}://${req.get('host')}/success?price=${price}`,
      cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
    },
    transactions: [
      {
        item_list: {
          items: [
            {
              name: item,
              sku: "001",
              price: price,
              currency: "USD",
              quantity: 1,
            },
          ],
        },
        amount: {
          currency: "USD",
          total: price,
        },
        description: `Purchase of ${item}`,
      },
    ],
  };

  paypal.payment.create(create_payment_json, function (error, payment) {
    if (error) {
      console.error("Payment creation error:", error.response);
      res.status(500).json({
        message: error.response.message,
        details: error.response.details,
      });
    } else {
      const approval_url = payment.links.find((link) => link.rel === "approval_url");
      if (approval_url) {
        res.redirect(approval_url.href);
      } else {
        res.status(400).send("No approval_url found");
      }
    }
  });
});

// Success route
app.get("/success", (req, res) => {
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  const price = req.query.price;

  const execute_payment_json = {
    payer_id: payerId,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: price,
        },
      },
    ],
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    if (error) {
      console.error("Payment execution error:", error.response);
      res.status(500).json({
        message: error.response.message,
        details: error.response.details,
      });
    } else {
      res.redirect("/?status=success");
    }
  });
});

// Cancel route
app.get("/cancel", (req, res) => res.send("Payment was cancelled."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
