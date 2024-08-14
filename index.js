const express = require("express");
const paypal = require("paypal-rest-sdk");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// PayPal configuration
paypal.configure({
  mode: "sandbox", // Sandbox or live
  client_id:
    "ATBa4YRS0y9avPSzCd717_jAFTj8KVztan0D0RBuode7BlzkG19wmQB2L0CG6wGTsVakwvX9P_ZxMTqV",
  client_secret:
    "EA_kCNW4GPJPpW3To-ojcrkqdFKmquauwotIURO-DLVj9O4UMLy9q4zVKTNTmga3DRspJ6X2UTsANwg7",
});

app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));

// Pay route
app.post("/pay", (req, res) => {
  const { item, price } = req.body;
  console.log({ item, price });
  const create_payment_json = {
    intent: "sale",
    payer: {
      payment_method: "paypal",
    },
    redirect_urls: {
      return_url: `http://localhost:3000/success?price=${price}`,
      cancel_url: "http://localhost:3000/cancel",
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
      let approval_url = payment.links.find(
        (link) => link.rel === "approval_url"
      );
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

  paypal.payment.execute(
    paymentId,
    execute_payment_json,
    function (error, payment) {
      if (error) {
        console.error("Payment execution error:", error.response);
        res.status(500).json({
          message: error.response.message,
          details: error.response.details,
        });
      } else {
        res.redirect("/?status=success");
      }
    }
  );
});

// Cancel route
app.get("/cancel", (req, res) => res.send("Payment was cancelled."));

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
