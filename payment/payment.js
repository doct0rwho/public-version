const dotenv = require("dotenv");
const CloudIpsp = require("cloudipsp-node-js-sdk");
const chai = require("chai");
const uuid = require("uuid");
const db = require("../db");
const base64url = require("base64url");
const axios = require("axios");
const crypto = require("crypto");
const con = require("../db");
const e = require("express");
const { get } = require("http");
const expect = chai.expect;
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const pdf = require("html-pdf");
const fs = require("fs");
const { type } = require("os");
const stripe = require("stripe")(
  `${process.env.STRIPE_SECRET_KEY}`
);

dotenv.config();

class Payment {
  async getPricing(req, res) {
    try {
      let plan = req.params.plan;
      const pricing = await db("price").select("*").where({ plan: plan });
      return res.status(200).json({ pricing: pricing });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: "error" });
    }
  }
  async subscriptionSuccessCallback(req, res) {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = "";

    let event;
    console.log(req.body);

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("Error verifying webhook signature:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    let date = new Date().toISOString().slice(0, 19).replace("T", " ");
    // Handle webhook events
    switch (event.type) {
      case "invoice.payment_failed":
        console.log("failed!");
        console.log(event.data.object);
        // Handle other actions for successful payment...

        break;
      case "invoice.paid":
        console.log("Payment successful!");
        console.log(event.data.object);
        // Handle other actions for successful payment...

        // await db("metaenga_payment_fondy").insert({
        //   payment_id: event.data.object.id,
        //   order_id: event.data.object.metadata.order_id,
        //   payment_status: event.data.object.status,
        //   payment_date: date,
        //   payment_type: "nested payment",
        //   payment_amount: event.data.object.amount_paid,
        // });

        break;
      case "customer.subscription.deleted":
        const invoiceId = event.data.object.id;
        console.log("Canceled!");
        console.log("metadata order id", event.data.object.metadata.order_id);
        let orderIdD = event.data.object.metadata.order_id;

        let order = await db("metaenga_order_fondy")
          .select("*")
          .where({ order_id: orderIdD })
          .first();
        let company = await db("company")
          .select("*")
          .where({ id: order.order_company })
          .first();

        let companyId = company.id;
        let customer_id = company.customer_id;
        const subscription = await stripe.subscriptions.list({
          customer: customer_id,
          limit: 1, // Limit the number of subscriptions returned to 1
        });

        if (subscription.data.length > 0) {
          const subscriptionId = subscription.data[0].id;
          console.log("Subscription ID:", subscriptionId);

          // Check if the retrieved subscription is canceled
          if (subscription.data[0].status === "canceled") {
            console.log("Subscription is canceled.");
            // Perform additional actions if needed
          }
        } else {
          console.log("No subscriptions found for the customer.");
        }
        let licenseCount = 0;
        const date = new Date().toISOString().slice(0, 19).replace("T", " ");

        const orderId = await db("metaenga_order_fondy")
          .first("*")
          .where({ order_company: companyId, order_status: "success" });

        try {
          await db("metaenga_licenses_logs").insert({
            company_id: companyId,
            status: 0,
            date: date,
            count_licenses: orderId.licenseCount,
          });
        } catch (error) {
          console.log(error);
        }
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", orderId);

        let subscription_id;
        const subscriptions = await stripe.subscriptions.list({
          customer: customer_id,
          status: "active",
          limit: 1, // Отримати лише одну активну підписку
        });
        let subscriptionEndDate;
        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0]; // Отримати першу (і, як ви сказали, єдину) підписку
          const updatedSubscription = await stripe.subscriptions.update(
            subscription.id,
            {
              cancel_at_period_end: true,
            }
          );
          subscriptionEndDate = updatedSubscription.current_period_end;
          subscription_id = updatedSubscription.id;
          // Оновлено підписку
        }
        console.log("SUBSCRIPTION END DATE", subscriptionEndDate);
        let dateTimeVar = new Date(subscriptionEndDate * 1000);

        // const fondy = new CloudIpsp({
        //   merchantId: 1514244,
        //   secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
        // });
        const ok = orderId.order_id;
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", ok);
        // const StopData = {
        //   order_id: ok,
        //   action: "stop",
        // };
        // console.log("CANCEL SUBSCRIPTION DATA", StopData);

        await db("metaenga_payment_fondy")
          .where({ order_id: orderId.order_id })
          .update({ payment_status: "stop" });
        await db("metaenga_order_fondy")
          .where({ order_id: orderId.order_id })
          .update({ order_status: "stop" });

        // fondy
        //   .SubscriptionActions(StopData)
        //   .then((data) => {
        //     console.log(data);
        //     // return res.status(200).json({data: data})
        //   })
        //   .catch((error) => {
        //     console.log(error);
        //   });
        let actualDate;
        let getLastPaymentTime = await db("metaenga_subscription_fondy")
          .where({ order_id: ok })
          .orderBy("payment_date", "desc")
          .first("*");
        if (!getLastPaymentTime) {
          let getLastPaymentTimePayment = await db("metaenga_payment_fondy")
            .where({ order_id: ok })
            .orderBy("payment_date", "desc")
            .first("*");
          actualDate = getLastPaymentTimePayment.payment_date;
        } else {
          actualDate = getLastPaymentTime.payment_date;
        }
        console.log(getLastPaymentTime);
        let paymentDate = new Date(actualDate);
        paymentDate.setMonth(paymentDate.getMonth() + 1);
        let currentDate = new Date();
        let timeDifferenceInMs = paymentDate - currentDate;
        console.log(timeDifferenceInMs);
        console.log(
          `Time difference in days: ${
            timeDifferenceInMs / (1000 * 60 * 60 * 24)
          }}`
        );
        res.status(200);
        //  await db('company').update({
        //    payedLicense: licenseCount
        //  }).where({id: companyId})
        let TESTPayment = new Date();
        TESTPayment.setDate(TESTPayment.getDate() + 1); // Add one day to the current date

        console.log("TEST PAYMENT DATE", paymentDate);

        await db("metaenga_cron").insert({
          plan: "Free",
          company: companyId,
          task_date: dateTimeVar, //paymentDate TESTPayment
          order_id: ok,
          task_desc: "cancel subscription",
          licenseCount: licenseCount,
        });
        await db("metaenga_cancel_fondy").insert({
          status: "cancel",
          company_id: companyId,
        });

        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  }
  async getCard(req, res) {
    try {
      const userId = req.params.userId;
      console.log("USER ID", userId);
      const company = await db("userlink").first("*").where({ user: userId });
      const companyPlan = await db("company")
        .first("*")
        .where({ id: company.company });
      let customer_id = companyPlan.customer_id;
      if (!customer_id) {
        return res.status(400).json({ message: "No customerId" });
      }
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customer_id,
        type: "card",
      });
      if (paymentMethods.data && paymentMethods.data.length > 0) {
        const card = paymentMethods.data[0].card;
        return res.status(200).json({ card: card });
      } else {
        return res.status(400).json({ message: "payment method not found" });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: "error" });
    }
  }
  async subscriptionCancelStripe(req, res) {
    try {
      const userId = req.params.userId;

      const getCompanyId = await db("userlink")
        .first("*")
        .where({ user: userId });
      let companyId = getCompanyId.company;
      let getCMP = await db("company").first("*").where({ id: companyId });
      let customer_id = getCMP.customer_id;
      let licenseCount = 0;
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");

      const orderId = await db("metaenga_order_fondy")
        .first("*")
        .where({ order_company: companyId, order_status: "success" });

      try {
        await db("metaenga_licenses_logs").insert({
          company_id: companyId,
          status: 0,
          date: date,
          count_licenses: orderId.licenseCount,
        });
      } catch (error) {
        console.log(error);
      }
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", orderId);

      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", getCMP);

      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", customer_id);

      if (!customer_id) {
        return res.status(400).json({ message: "No customerId" });
      }

      let subscription_id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customer_id,
        status: "active",
        limit: 1, // Отримати лише одну активну підписку
      });
      let subscriptionEndDate;
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0]; // Отримати першу (і, як ви сказали, єдину) підписку
        const updatedSubscription = await stripe.subscriptions.update(
          subscription.id,
          {
            cancel_at_period_end: true,
          }
        );
        subscriptionEndDate = updatedSubscription.current_period_end;
        subscription_id = updatedSubscription.id;
        // Оновлено підписку
      }
      console.log("SUBSCRIPTION END DATE", subscriptionEndDate);
      let dateTimeVar = new Date(subscriptionEndDate * 1000);

      // const fondy = new CloudIpsp({
      //   merchantId: 1514244,
      //   secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
      // });
      const ok = orderId.order_id;
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", ok);
      // const StopData = {
      //   order_id: ok,
      //   action: "stop",
      // };
      // console.log("CANCEL SUBSCRIPTION DATA", StopData);

      await db("metaenga_payment_fondy")
        .where({ order_id: orderId.order_id })
        .update({ payment_status: "stop" });
      await db("metaenga_order_fondy")
        .where({ order_id: orderId.order_id })
        .update({ order_status: "stop" });

      // fondy
      //   .SubscriptionActions(StopData)
      //   .then((data) => {
      //     console.log(data);
      //     // return res.status(200).json({data: data})
      //   })
      //   .catch((error) => {
      //     console.log(error);
      //   });
      let actualDate;
      let getLastPaymentTime = await db("metaenga_subscription_fondy")
        .where({ order_id: ok })
        .orderBy("payment_date", "desc")
        .first("*");
      if (!getLastPaymentTime) {
        let getLastPaymentTimePayment = await db("metaenga_payment_fondy")
          .where({ order_id: ok })
          .orderBy("payment_date", "desc")
          .first("*");
        actualDate = getLastPaymentTimePayment.payment_date;
      } else {
        actualDate = getLastPaymentTime.payment_date;
      }
      console.log(getLastPaymentTime);
      let paymentDate = new Date(actualDate);
      paymentDate.setMonth(paymentDate.getMonth() + 1);
      let currentDate = new Date();
      let timeDifferenceInMs = paymentDate - currentDate;
      console.log(timeDifferenceInMs);
      console.log(
        `Time difference in days: ${
          timeDifferenceInMs / (1000 * 60 * 60 * 24)
        }}`
      );
      res.status(200);
      //  await db('company').update({
      //    payedLicense: licenseCount
      //  }).where({id: companyId})
      let TESTPayment = new Date();
      TESTPayment.setDate(TESTPayment.getDate() + 1); // Add one day to the current date

      console.log("TEST PAYMENT DATE", paymentDate);

      await db("metaenga_cron").insert({
        plan: "Free",
        company: companyId,
        task_date: dateTimeVar, //paymentDate TESTPayment
        order_id: ok,
        task_desc: "cancel subscription",
        licenseCount: licenseCount,
      });
      await db("metaenga_cancel_fondy").insert({
        status: "cancel",
        company_id: companyId,
      });

      return res.status(200).json({
        message: "success",
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async subscriptionRenewStripe(req, res) {
    try {
      const userId = req.params.userId;

      const getCompanyId = await db("userlink")
        .first("*")
        .where({ user: userId });
      let companyId = getCompanyId.company;
      let getCMP = await db("company").first("*").where({ id: companyId });
      let customer_id = getCMP.customer_id;
      let licenseCount = 0;
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");

      const orderId = await db("metaenga_order_fondy")
        .select("*")
        .where({ order_company: companyId, order_status: "stop" })
        .orderBy("order_id", "desc")
        .limit(1)
        .first();

      try {
        await db("metaenga_licenses_logs").insert({
          company_id: companyId,
          status: 1,
          date: date,
          count_licenses: orderId.licenseCount,
        });
      } catch (error) {
        console.log(error);
      }
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", orderId);

      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", getCMP);

      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", customer_id);

      if (!customer_id) {
        return res.status(400).json({ message: "No customerId" });
      }

      let subscription_id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customer_id,
        status: "active",
        limit: 1, // Отримати лише одну активну підписку
      });
      let subscriptionEndDate;
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0]; // Отримати першу (і, як ви сказали, єдину) підписку
        const updatedSubscription = await stripe.subscriptions.update(
          subscription.id,
          {
            cancel_at_period_end: false,
          }
        );
        subscriptionEndDate = updatedSubscription.current_period_end;
        subscription_id = updatedSubscription.id;
        // Оновлено підписку
      }
      console.log("SUBSCRIPTION END DATE", subscriptionEndDate);
      let dateTimeVar = new Date(subscriptionEndDate * 1000);

      // const fondy = new CloudIpsp({
      //   merchantId: 1514244,
      //   secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
      // });
      const ok = orderId.order_id;
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", ok);
      // const StopData = {
      //   order_id: ok,
      //   action: "stop",
      // };
      // console.log("CANCEL SUBSCRIPTION DATA", StopData);

      await db("metaenga_payment_fondy")
        .where({ order_id: orderId.order_id })
        .update({ payment_status: "approved" });
      await db("metaenga_order_fondy")
        .where({ order_id: orderId.order_id })
        .update({ order_status: "success" });

      // fondy
      //   .SubscriptionActions(StopData)
      //   .then((data) => {
      //     console.log(data);
      //     // return res.status(200).json({data: data})
      //   })
      //   .catch((error) => {
      //     console.log(error);
      //   });

      await db("metaenga_cron").first("*").where({ order_id: ok }).del();

      return res.status(200).json({
        message: "success",
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async orderUpdate(req, res) {
    try {
      const {
        userId,
        licenseCount,
        mail,
        description,
        amount,
        newPlan,
        status,
        success_url,
        cancel_url,
      } = req.body;

      let customer_id;
      const planArray = ["Free", "Standart", "Premium"];

      const company = await db("userlink").first("*").where({ user: userId });
      const companyPlan = await db("company")
        .first("*")
        .where({ id: company.company });

      if (companyPlan.customer_id) {
        customer_id = companyPlan.customer_id;
      } else {
        const customer = await stripe.customers.create({
          email: mail,
          name: companyPlan.name,
        });
        customer_id = customer.id;
        await db("company")
          .update({ customer_id: customer_id })
          .where({ id: company.company });
      }

      const companyIndex = planArray.indexOf(companyPlan.plan);
      console.log("Company Index:", companyPlan.plan);
      const newPlanIndex = planArray.indexOf(newPlan);
      console.log("New Plan Index:", newPlan);

      // Create a new order in your database
      const orderArr = await db("metaenga_order_fondy")
        .insert({
          order_status: "created",
          order_date: new Date(),
          amount: amount,
          currency: "USD",
          licenseCount: licenseCount,
          mail: mail,
          order_desc: description,
          order_company: company.company,
          newPlan: newPlan,
        })
        .returning("order_id");
      const orderId = orderArr[0];

      // If the new plan is an upgrade or the same as the current plan
      console.log("Company Index:", companyIndex);
      console.log("New Plan Index:", newPlanIndex);

      if (companyIndex <= newPlanIndex) {
        // Create a new Checkout Session
        console.log("DEFAULT");
        // const session = await stripe.checkout.sessions.create({
        //   customer: customer_id,
        //   mode: "subscription",
        //   payment_method_types: ["card"],
        //   ui_mode: "embedded",
        //   line_items: [
        //     {
        //       price: "price_1P1TY2ACtPVEAgimvGytzhuy", // Replace with the actual price ID
        //       quantity: licenseCount,
        //     },
        //   ],
        //   redirect_on_completion: "never", // Replace with your return URL
        //   metadata: {
        //     order_id: orderId, // Include the order_id as metadata
        //   },
        //   //success_url: success_url, // Replace with your success URL
        //   //cancel_url: cancel_url, // Replace with your cancel URL
        // });
        // console.log("Session:", session);

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      } else {
        // If the new plan is a downgrade
        // Cancel the current subscription
        console.log("WITH CANCEL");
        const currentSubscription = await stripe.subscriptions.list({
          customer: customer_id,
          limit: 1,
        });

        if (currentSubscription.data.length > 0) {
          // Cancel the current subscription
          await stripe.subscriptions.cancel(currentSubscription.data[0].id);
        }

        // Create a new Checkout Session for the new plan
        // const session = await stripe.checkout.sessions.create({
        //   customer: customer_id,
        //   mode: "subscription",
        //   payment_method_types: ["card"],
        //   ui_mode: "embedded",
        //   line_items: [
        //     {
        //       price: "price_1P1TY2ACtPVEAgimvGytzhuy", // Replace with the actual price ID
        //       quantity: licenseCount,
        //     },
        //   ],
        //   redirect_on_completion: "never",
        //   metadata: {
        //     order_id: orderId, // Include the order_id as metadata
        //   },

        //   //success_url: success_url, // Replace with your success URL
        //   //cancel_url: cancel_url, // Replace with your cancel URL
        // });
        // console.log("Session:", session);

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      }
    } catch (error) {
      console.error("Subscription order error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async addProductToSubscription(req, res) {
    try {
      const { productId, customerId } = req.body;
      //here
      // Retrieve the customer's subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        // check if subscription not exist
        return res
          .status(400)
          .json({ message: "No subscriptions found for this customer" });
      }

      const subscription = subscriptions.data[0];

      // Check if the price is already in the subscription items
      let existingItem = subscription.items.data.find(
        (item) => item.price.id === productId
      );

      if (existingItem) {
        // Update the existing subscription item
        const updatedSubscriptionItem = await stripe.subscriptionItems.update(
          existingItem.id,
          {
            quantity: existingItem.quantity + 3, // Increment the quantity or update as needed
            proration_behavior: "always_invoice", // Include proration_behavior within the options object
          }
        );

        console.log("Updated subscription item:", updatedSubscriptionItem.id);

        return res.status(200).json({ updatedSubscriptionItem });
      } else {
        // Add a new subscription item
        const newSubscriptionItem = await stripe.subscriptionItems.create({
          subscription: subscription.id,
          price: productId,
          quantity: 5, // Set the quantity
        });

        console.log("Added new subscription item:", newSubscriptionItem.id);

        return res.status(200).json({ newSubscriptionItem });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: "error", error: error.message });
    }
  }
  async updateFlexSubscription(req, res) {
    try {
      let { userId, items, video, proration_behavior } = req.body;
      console.log("USER ID", userId);
      console.log("ITEMS", items);

      let getCompanyId = await db("userlink")
        .first("*")
        .where({ user: userId });
      let getCustomerId = await db("company")
        .first("*")
        .where({ id: getCompanyId.company });
      let customerId = getCustomerId.customer_id;

      let stripeProducts = await stripe.products.list({
        limit: 100,
      });
      let stripeProductsData = stripeProducts.data;
      let toAddOrUpdateArr = [];
      console.log(stripeProductsData);

      if (video === true) {
        toAddOrUpdateArr.push({
          id: "price_1PbKiRACtPVEAgimR9fjW7HZ",
          quantity: 1,
        });
      }

      stripeProductsData.forEach((product) => {
        console.log(product.metadata.id);
        items.find((item) => {
          if (product.metadata.id === item.id) {
            toAddOrUpdateArr.push({
              subItemId: product.id,
              id: product.default_price,
              quantity: item.quantity,
            });
          }
        });
      });

      console.log("TO ADD OR UPDATE", toAddOrUpdateArr);

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });
      let existingItems = subscriptions.data[0].items.data;
      let existingItemsArr = [];

      existingItems.forEach((item) => {
        existingItemsArr.push({
          subItemId: item.id,
          id: item.price.id,
          quantity: item.quantity,
        });
      });

      console.log("EXISTING ITEMS ARR", existingItemsArr);
      let newItemsArr = [...existingItemsArr, ...toAddOrUpdateArr];
      console.log("NEW ITEMS ARR", newItemsArr);

      let updatePromises = toAddOrUpdateArr.map(async (item) => {
        let existingItem = existingItemsArr.find(
          (existingItem) => existingItem.id === item.id
        );
        if (existingItem) {
          return stripe.subscriptionItems.update(existingItem.subItemId, {
            quantity: item.quantity,
            proration_behavior: proration_behavior,
          });
        } else {
          return stripe.subscriptionItems.create({
            subscription: subscriptions.data[0].id,
            price: item.id,
            quantity: item.quantity,
            proration_behavior: proration_behavior,
          });
        }
      });

      // Wait for all update operations to complete
      await Promise.all(updatePromises);

      return res.status(200).json({ message: "OK" });
    } catch (error) {
      console.error("Subscription order error:", error);
      return res.status(400).json({ message: "error" });
    }
  }

  async flexCancel(req, res) {
    try {
      let { companyId, trainingId } = req.body;
      let company = await db("company").first("*").where({ id: companyId });
      let customerId = company.customer_id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });
      let trainingPrice = await db("trainings")
        .first("*")
        .where({ id: trainingId });
      console.log("TRAINING PRICE", trainingPrice);
      let exactID = trainingPrice.priceId;
      let subscription = subscriptions.data[0];
      let subscriptionItems = subscription.items.data;
      console.log(subscriptionItems);
      if (subscriptionItems.length === 1) {
        await stripe.subscriptions.cancel(subscription.id);
        const requestBody = {
          company: companyId,
          newPlan: "Free",
        };

        const response = await updatePlan(requestBody).catch((error) => {
          console.log(error);
        });
        return res
          .status(200)
          .json({ message: "Product removed from subscription" });
      } else {
        let subscriptionItem = subscriptionItems.find(
          (item) => item.price.id === exactID
        );
        if (!subscriptionItem) {
          return res
            .status(400)
            .json({ message: "Product not found in subscription" });
        }
        await stripe.subscriptionItems.del(subscriptionItem.id, {
          proration_behavior: "none",
        });

        await db("metaenga_training_company")
          .where({ company: companyId, training: trainingId, plan: "flex" })
          .del();

        await db("metaenga_flex_assign")
          .where({ company: companyId, training: trainingId })
          .del();

        return res
          .status(200)
          .json({ message: "Product removed from subscription" });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: error });
    }
  }
  async flex360Cancel(req, res) {
    try {
      let { companyId } = req.body;
      const video360price = `${process.env.VIDEO_PRICE}`;
      let company = await db("company").first("*").where({ id: companyId });
      let customerId = company.customer_id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });
      let subscription = subscriptions.data[0];
      let subscriptionItems = subscription.items.data;
      if (subscriptionItems.length === 1) {
        await stripe.subscriptions.cancel(subscription.id);
        return res.status(200).json({ message: "Subscription canceled" });
      } else {
        let subscriptionItem = subscriptionItems.find(
          (item) => item.price.id === video360price
        );
        if (!subscriptionItem) {
          return res
            .status(400)
            .json({ message: "Product not found in subscription" });
        }
        await stripe.subscriptionItems.del(subscriptionItem.id, {
          proration_behavior: "none",
        });
        return res.status(200).json({ message: "Subscription canceled" });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: error });
    }
  }
  async removeProductFromSubscription(req, res) {
    try {
      const { productId, customerId } = req.body;

      // Retrieve the customer's subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });

      if (subscriptions.data.length === 0) {
        return res
          .status(400)
          .json({ message: "No subscriptions found for this customer" });
      }

      const subscription = subscriptions.data[0];

      // Find the subscription item with the specified price ID
      const subscriptionItem = subscription.items.data.find(
        (item) => item.price.id === productId
      );

      if (!subscriptionItem) {
        return res
          .status(400)
          .json({ message: "Product not found in subscription" });
      }

      // Delete the subscription item
      await stripe.subscriptionItems.del(subscriptionItem.id);

      console.log(`Subscription item removed: ${subscriptionItem.id}`);

      return res
        .status(200)
        .json({ message: "Product removed from subscription" });
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        message: "Error removing product from subscription",
        error: error.message,
      });
    }
  }
  async getSubscriptions(req, res) {
    try {
      let user = req.params.userId;
      let getCompanyId = await db("userlink").first("*").where({ user: user });
      let getCustomerId = await db("company")
        .first("*")
        .where({ id: getCompanyId.company });
      let customerId = getCustomerId.customer_id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1, // Adjust the limit as needed
      });
      const productIds = new Set();

      // Extract product IDs from the subscription items
      subscriptions.data.forEach((subscription) => {
        subscription.items.data.forEach((item) => {
          productIds.add(item.price.product);
        });
      });

      // Fetch product details
      const products = [];
      for (const productId of productIds) {
        const product = await stripe.products.retrieve(productId);
        let quantity, used;
        if (product.metadata.id == undefined) {
          quantity = "video set";
          used = "video set";
        } else {
          console.log("company", getCompanyId.company);
          console.log("training", product.metadata.id);
          let trainingAssignData = await db("metaenga_training_company")
            .first("*")
            .where({
              company: getCompanyId.company,
              plan: "flex",
              training: product.metadata.id,
            });
          quantity = trainingAssignData.quantity;
          let trainingAssignUsed = await db("metaenga_flex_assign")
            .count("*")
            .where({
              company: getCompanyId.company,
              training: product.metadata.id,
            });
          console.log("trainingAssignUsed", trainingAssignUsed);
          if (trainingAssignUsed.length > 0) {
            used = trainingAssignUsed[0]["count(*)"];
          }
        }
        let tempObject = {
          images: product.images,
          metadata: product.metadata,
          name: product.name,
          quantity: quantity,
          used: used,
        };
        products.push(tempObject);
      }

      // Log the list of products
      console.log(products);
      return res.status(200).json({ products: products });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: "error" });
    }
  }

  async prodFlex(req, res) {
    try {
      let { userId, items, headsets, status, video, amount } = req.body;
      let newPlan = "Flex";
      status = "update";
      let line_items = [];
      if (video == true) {
        line_items.push({
          price: `${process.env.VIDEO_PRICE}`,//video price prod price_1PixOkACtPVEAgimLfOH880V dev price_1PbKiRACtPVEAgimR9fjW7HZ
          quantity: 1,
        });
      }
      console.log("USER ID", userId);
      for (let i = 0; i < items.length; i++) {
        let itemInfo = await db("trainings").first("*").where({ id: items[i] });
        let priceId = itemInfo.priceId;
        line_items.push({
          price: priceId,
          quantity: headsets,
        });
      }

      const company = await db("userlink").first("*").where({ user: userId });
      let mail = company.login;
      const companyPlan = await db("company")
        .first("*")
        .where({ id: company.company });

      let customer_id;

      if (companyPlan.customer_id) {
        customer_id = companyPlan.customer_id;
        console.log("FOUND");
        console.log("CUSTOMER ID", customer_id);
      } else {
        const customer = await stripe.customers.create({
          email: mail,
          name: companyPlan.name,
        });
        customer_id = customer.id;
        console.log("NOT FOUND");
        console.log("CUSTOMER ID", customer_id);
        await db("company")
          .update({ customer_id: customer_id })
          .where({ id: company.company });
      }

      let subscrCheck = await stripe.subscriptions.list({
        customer: customer_id,
        status: "active",
        limit: 1, // Отримати лише одну активну підписку
      });

      let newSub;

      if (subscrCheck.data.length > 0) {
        newSub = false;
      } else {
        newSub = true;
      }

      await db("metaenga_order_fondy")
        .where({ order_company: company.company, order_status: "created" })
        .andWhere({ order_company: company.company, order_status: "stop" })
        .del();

      // Create a new order in your database
      const orderArr = await db("metaenga_order_fondy")
        .insert({
          order_status: "created",
          order_date: new Date(),
          amount: amount,
          currency: "USD",
          licenseCount: headsets,
          order_company: company.company,
          newPlan: newPlan,
        })
        .returning("order_id");
      const orderId = orderArr[0];
      if (newSub) {
        let session = await stripe.checkout.sessions.create({
          customer: customer_id,
          mode: "subscription",
          payment_method_types: ["card"],
          ui_mode: "embedded",
          line_items: line_items,
          redirect_on_completion: "never",
          metadata: {
            type: "flex",
            order_id: orderId,
          },
        });
        console.log("Session:", session);

        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      } else {
        let session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          customer: customer_id,
          ui_mode: "embedded",
          redirect_on_completion: "never",
          line_items: line_items,
          metadata: {
            type: "flex",
            order_id: orderId,
          },
          invoice_creation: {
            enabled: true,
          },
          payment_intent_data: {
            setup_future_usage: "off_session",
          },
          mode: "payment",
        });
        console.log("Session:", session);
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });
        return res.status(200).json({ client_secret: session.client_secret });
      }
    } catch (error) {
      console.error("Subscription order error:", error);
      return res.status(400).json({ message: "error" });
    }
  }

  async test(req, res) {
    try {
      const {
        userId,
        licenseCount,
        mail,
        description,
        amount,
        newPlan,
        status,
        line_items,
        success_url,
        cancel_url,
      } = req.body;

      let customer_id;

      // Define your plans array and get the current and new plan indices
      const planArray = ["Free", "Standart", "Premium"];

      const company = await db("userlink").first("*").where({ user: userId });
      const companyPlan = await db("company")
        .first("*")
        .where({ id: company.company });

      //check if customer has subscription in stripe

      if (companyPlan.customer_id) {
        customer_id = companyPlan.customer_id;
        console.log("FOUND");
        console.log("CUSTOMER ID", customer_id);
      } else {
        const customer = await stripe.customers.create({
          email: mail,
          name: companyPlan.name,
        });
        customer_id = customer.id;
        console.log("NOT FOUND");
        console.log("CUSTOMER ID", customer_id);
        await db("company")
          .update({ customer_id: customer_id })
          .where({ id: company.company });
      }

      let subscrCheck = await stripe.subscriptions.list({
        customer: customer_id,
        status: "active",
        limit: 1, // Отримати лише одну активну підписку
      });

      let newSub;

      if (subscrCheck.data.length > 0) {
        newSub = false;
      } else {
        newSub = true;
      }

      const companyIndex = planArray.indexOf(companyPlan.plan);
      console.log("Company Index:", companyPlan.plan);
      const newPlanIndex = planArray.indexOf(newPlan);
      console.log("New Plan Index:", newPlan);
      //delete all records with status created
      await db("metaenga_order_fondy")
        .where({ order_company: company.company, order_status: "created" })
        .andWhere({ order_company: company.company, order_status: "stop" })
        .del();

      // Create a new order in your database
      const orderArr = await db("metaenga_order_fondy")
        .insert({
          order_status: "created",
          order_date: new Date(),
          amount: amount,
          currency: "USD",
          licenseCount: licenseCount,
          mail: mail,
          order_desc: description,
          order_company: company.company,
          newPlan: newPlan,
        })
        .returning("order_id");
      const orderId = orderArr[0];

      // If the new plan is an upgrade or the same as the current plan
      console.log("Company Index:", companyIndex);
      console.log("New Plan Index:", newPlanIndex);
      if (companyIndex <= newPlanIndex) {
        // Create a new Checkout Session
        console.log("DEFAULT");
        let session;
        if (newSub) {
          session = await stripe.checkout.sessions.create({
            customer: customer_id,
            mode: "subscription",
            payment_method_types: ["card"],
            ui_mode: "embedded",
            line_items: line_items,
            // line_items: [
            //   {
            //     price: "price_1P6BiZACtPVEAgimgftjgBSb", // month dev price_1P6B9EACtPVEAgimTtywPS0t month prod price_1P6BiZACtPVEAgimgftjgBSb
            //     quantity: licenseCount,
            //   },
            // ],
            redirect_on_completion: "never", // Replace with your return URL
            metadata: {
              order_id: orderId, // Include the order_id as metadata
            },
            //success_url: success_url, // Replace with your success URL
            //cancel_url: cancel_url, // Replace with your cancel URL
          });
          console.log("Session:", session);
        } else {
          session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer: customer_id,
            ui_mode: "embedded",
            redirect_on_completion: "never",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Payment for subscription",
                  },
                  unit_amount: amount, // Сума платежу у центах (20 доларів)
                },
                quantity: 1,
              },
            ],
            metadata: {
              order_id: orderId, // Include the order_id as metadata
            },
            invoice_creation: {
              enabled: true,
            },
            payment_intent_data: {
              setup_future_usage: "off_session",
            },
            mode: "payment",
          });
          console.log("Session:", session);
        }

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      } else {
        // If the new plan is a downgrade
        // Cancel the current subscription
        console.log("WITH CANCEL");
        const currentSubscription = await stripe.subscriptions.list({
          customer: customer_id,
          limit: 1,
        });

        if (currentSubscription.data.length > 0) {
          // Cancel the current subscription
          await stripe.subscriptions.cancel(currentSubscription.data[0].id);
        }

        // Create a new Checkout Session for the new plan
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Payment for subscription",
                },
                unit_amount: "20", // Сума платежу у центах (20 доларів)
              },
              quantity: 1,
            },
          ],
          metadata: {
            order_id: orderId, // Include the order_id as metadata
          },
          mode: "payment",
        });
        console.log("Session:", session);

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      }
    } catch (error) {
      console.error("Subscription order error:", error);
      return res.status(400).json({ message: "error" });
    }
  }

  async order(req, res) {
    try {
      const {
        userId,
        licenseCount,
        mail,
        description,
        amount,
        newPlan,
        status,
        success_url,
        cancel_url,
      } = req.body;

      let customer_id;

      // Define your plans array and get the current and new plan indices
      const planArray = ["Free", "Standart", "Premium"];

      const company = await db("userlink").first("*").where({ user: userId });
      const companyPlan = await db("company")
        .first("*")
        .where({ id: company.company });

      //check if customer has subscription in stripe

      if (companyPlan.customer_id) {
        customer_id = companyPlan.customer_id;
        console.log("FOUND");
        console.log("CUSTOMER ID", customer_id);
      } else {
        const customer = await stripe.customers.create({
          email: mail,
          name: companyPlan.name,
        });
        customer_id = customer.id;
        console.log("NOT FOUND");
        console.log("CUSTOMER ID", customer_id);
        await db("company")
          .update({ customer_id: customer_id })
          .where({ id: company.company });
      }

      let subscrCheck = await stripe.subscriptions.list({
        customer: customer_id,
        status: "active",
        limit: 1, // Отримати лише одну активну підписку
      });

      let newSub;

      if (subscrCheck.data.length > 0) {
        newSub = false;
      } else {
        newSub = true;
      }

      const companyIndex = planArray.indexOf(companyPlan.plan);
      console.log("Company Index:", companyPlan.plan);
      const newPlanIndex = planArray.indexOf(newPlan);
      console.log("New Plan Index:", newPlan);
      //delete all records with status created
      await db("metaenga_order_fondy")
        .where({ order_company: company.company, order_status: "created" })
        .andWhere({ order_company: company.company, order_status: "stop" })
        .del();

      // Create a new order in your database
      const orderArr = await db("metaenga_order_fondy")
        .insert({
          order_status: "created",
          order_date: new Date(),
          amount: amount,
          currency: "USD",
          licenseCount: licenseCount,
          mail: mail,
          order_desc: description,
          order_company: company.company,
          newPlan: newPlan,
        })
        .returning("order_id");
      const orderId = orderArr[0];

      // If the new plan is an upgrade or the same as the current plan
      console.log("Company Index:", companyIndex);
      console.log("New Plan Index:", newPlanIndex);
      if (companyIndex <= newPlanIndex) {
        // Create a new Checkout Session
        console.log("DEFAULT");
        let session;
        if (newSub) {
          session = await stripe.checkout.sessions.create({
            customer: customer_id,
            mode: "subscription",
            payment_method_types: ["card"],
            ui_mode: "embedded",
            line_items: [
              {
                price: `${process.env.MONTHLY_PRICE}`, // month dev price_1P6B9EACtPVEAgimTtywPS0t month prod price_1P6BiZACtPVEAgimgftjgBSb
                quantity: licenseCount,
              },
            ],
            redirect_on_completion: "never", // Replace with your return URL
            metadata: {
              type: "regular",
              order_id: orderId, // Include the order_id as metadata
            },
            //success_url: success_url, // Replace with your success URL
            //cancel_url: cancel_url, // Replace with your cancel URL
          });
          console.log("Session:", session);
        } else {
          session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer: customer_id,
            ui_mode: "embedded",
            redirect_on_completion: "never",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Payment for subscription",
                  },
                  unit_amount: amount, // Сума платежу у центах (20 доларів)
                },
                quantity: 1,
              },
            ],
            metadata: {
              type: "regular",
              order_id: orderId, // Include the order_id as metadata
            },
            invoice_creation: {
              enabled: true,
            },
            payment_intent_data: {
              setup_future_usage: "off_session",
            },
            mode: "payment",
          });
          console.log("Session:", session);
          // await stripe.subscriptions.update(subscrCheck.data[0].id, { // для последующего апдейта подписки
          //   metadata: {
          //     order_id: orderId,
          //   },
          //   quantity: licenseCount,
          //   proration_behavior: "always_invoice",
          // });
        }

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      } else {
        // If the new plan is a downgrade
        // Cancel the current subscription
        console.log("WITH CANCEL");
        const currentSubscription = await stripe.subscriptions.list({
          customer: customer_id,
          limit: 1,
        });

        if (currentSubscription.data.length > 0) {
          // Cancel the current subscription
          await stripe.subscriptions.cancel(currentSubscription.data[0].id);
        }

        // Create a new Checkout Session for the new plan
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Payment for subscription",
                },
                unit_amount: "20", // Сума платежу у центах (20 доларів)
              },
              quantity: 1,
            },
          ],
          metadata: {
            order_id: orderId, // Include the order_id as metadata
          },
          mode: "payment",
        });
        console.log("Session:", session);

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      }
    } catch (error) {
      console.error("Subscription order error:", error);
      return res.status(400).json({ message: "error" });
    }
  }

  async orderEnterprise(req, res) {
    try {
      const {
        userId,
        licenseCount,
        mail,
        description,
        amount,
        newPlan,
        status,
        success_url,
        cancel_url,
      } = req.body;

      let customer_id;

      // Define your plans array and get the current and new plan indices
      const planArray = ["Free", "Standart", "Premium", "Enterprise"];

      const company = await db("userlink").first("*").where({ user: userId });
      const companyPlan = await db("company")
        .first("*")
        .where({ id: company.company });

      //check if customer has subscription in stripe

      if (companyPlan.customer_id) {
        customer_id = companyPlan.customer_id;
        console.log("FOUND");
        console.log("CUSTOMER ID", customer_id);
      } else {
        const customer = await stripe.customers.create({
          email: mail,
          name: companyPlan.name,
        });
        customer_id = customer.id;
        console.log("NOT FOUND");
        console.log("CUSTOMER ID", customer_id);
        await db("company")
          .update({ customer_id: customer_id })
          .where({ id: company.company });
      }

      let subscrCheck = await stripe.subscriptions.list({
        customer: customer_id,
        status: "active",
        limit: 1, // Отримати лише одну активну підписку
      });

      let newSub;

      if (subscrCheck.data.length > 0) {
        newSub = false;
      } else {
        newSub = true;
      }

      const companyIndex = planArray.indexOf(companyPlan.plan);
      console.log("Company Index:", companyPlan.plan);
      const newPlanIndex = planArray.indexOf(newPlan);
      console.log("New Plan Index:", newPlan);
      //delete all records with status created
      await db("metaenga_order_fondy")
        .where({ order_company: company.company, order_status: "created" })
        .andWhere({ order_company: company.company, order_status: "stop" })
        .del();

      // Create a new order in your database
      const orderArr = await db("metaenga_order_fondy")
        .insert({
          order_status: "created",
          order_date: new Date(),
          amount: amount,
          currency: "USD",
          licenseCount: licenseCount,
          mail: mail,
          order_desc: description,
          order_company: company.company,
          newPlan: newPlan,
        })
        .returning("order_id");
      const orderId = orderArr[0];

      // If the new plan is an upgrade or the same as the current plan
      console.log("Company Index:", companyIndex);
      console.log("New Plan Index:", newPlanIndex);
      if (companyIndex <= newPlanIndex) {
        // Create a new Checkout Session
        console.log("DEFAULT");
        let session;
        if (newSub) {
          session = await stripe.checkout.sessions.create({
            customer: customer_id,
            mode: "subscription",
            payment_method_types: ["card"],
            ui_mode: "embedded",
            line_items: [
              {
                price: `${process.env.ENTERPRISE_PRICE}`, // month dev price_1P6B9EACtPVEAgimTtywPS0t month prod price_1P6BiZACtPVEAgimgftjgBSb
                quantity: licenseCount,
              },
            ],
            redirect_on_completion: "never", // Replace with your return URL
            metadata: {
              type: "regular",
              order_id: orderId, // Include the order_id as metadata
            },
            //success_url: success_url, // Replace with your success URL
            //cancel_url: cancel_url, // Replace with your cancel URL
          });
          console.log("Session:", session);
        } else {
          session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer: customer_id,
            ui_mode: "embedded",
            redirect_on_completion: "never",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Payment for subscription",
                  },
                  unit_amount: amount, // Сума платежу у центах (20 доларів)
                },
                quantity: 1,
              },
            ],
            metadata: {
              type: "regular",
              order_id: orderId, // Include the order_id as metadata
            },
            invoice_creation: {
              enabled: true,
            },
            payment_intent_data: {
              setup_future_usage: "off_session",
            },
            mode: "payment",
          });
          console.log("Session:", session);
          // await stripe.subscriptions.update(subscrCheck.data[0].id, { // для последующего апдейта подписки
          //   metadata: {
          //     order_id: orderId,
          //   },
          //   quantity: licenseCount,
          //   proration_behavior: "always_invoice",
          // });
        }

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      } else {
        // If the new plan is a downgrade
        // Cancel the current subscription
        console.log("WITH CANCEL");
        const currentSubscription = await stripe.subscriptions.list({
          customer: customer_id,
          limit: 1,
        });

        if (currentSubscription.data.length > 0) {
          // Cancel the current subscription
          await stripe.subscriptions.cancel(currentSubscription.data[0].id);
        }

        // Create a new Checkout Session for the new plan
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Payment for subscription",
                },
                unit_amount: "20", // Сума платежу у центах (20 доларів)
              },
              quantity: 1,
            },
          ],
          metadata: {
            order_id: orderId, // Include the order_id as metadata
          },
          mode: "payment",
        });
        console.log("Session:", session);

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      }
    } catch (error) {
      console.error("Subscription order error:", error);
      return res.status(400).json({ message: "error" });
    }
  }


  async orderVR(req, res) {
    try {
      const { userId, licenseCount, mail, cancel_url } = req.body;

      let customer_id;
      const success_url = "https://app.metaenga.com/";
      // Define your plans array and get the current and new plan indices
      const newPlan = "Standart";
      const planArray = ["Free", "Standart", "Premium"];
      const status = "VR created";
      const company = await db("userlink").first("*").where({ user: userId });
      const companyPlan = await db("company")
        .first("*")
        .where({ id: company.company });

      //check if customer has subscription in stripe

      if (companyPlan.customer_id) {
        customer_id = companyPlan.customer_id;
        console.log("FOUND");
        console.log("CUSTOMER ID", customer_id);
      } else {
        const customer = await stripe.customers.create({
          email: mail,
          name: companyPlan.name,
        });
        customer_id = customer.id;
        console.log("NOT FOUND");
        console.log("CUSTOMER ID", customer_id);
        await db("company")
          .update({ customer_id: customer_id })
          .where({ id: company.company });
      }

      let subscrCheck = await stripe.subscriptions.list({
        customer: customer_id,
        status: "active",
        limit: 1, // Отримати лише одну активну підписку
      });

      let newSub;

      if (subscrCheck.data.length > 0) {
        newSub = false;
      } else {
        newSub = true;
      }

      const companyIndex = planArray.indexOf(companyPlan.plan);
      console.log("Company Index:", companyPlan.plan);
      const newPlanIndex = planArray.indexOf(newPlan);
      console.log("New Plan Index:", newPlan);
      //delete all records with status created
      await db("metaenga_order_fondy")
        .where({ order_company: company.company, order_status: "created" })
        .andWhere({ order_company: company.company, order_status: "stop" })
        .del();

      // Create a new order in your database
      const orderArr = await db("metaenga_order_fondy")
        .insert({
          order_status: "created",
          order_date: new Date(),
          currency: "USD",
          licenseCount: licenseCount,
          mail: mail,
          order_company: company.company,
          newPlan: newPlan,
        })
        .returning("order_id");
      const orderId = orderArr[0];

      // If the new plan is an upgrade or the same as the current plan
      console.log("Company Index:", companyIndex);
      console.log("New Plan Index:", newPlanIndex);
      if (companyIndex <= newPlanIndex) {
        // Create a new Checkout Session
        console.log("DEFAULT");
        let session;
        if (newSub) {
          session = await stripe.checkout.sessions.create({
            customer: customer_id,
            mode: "subscription",
            payment_method_types: ["card"],
            success_url: success_url,
            // ui_mode: "embedded",
            line_items: [
              {
                price: "price_1P6B9EACtPVEAgimTtywPS0t", // month dev price_1P6B9EACtPVEAgimTtywPS0t month prod price_1P6BiZACtPVEAgimgftjgBSb
                quantity: licenseCount,
              },
            ],
            // redirect_on_completion: "never", // Replace with your return URL
            metadata: {
              order_id: orderId, // Include the order_id as metadata
            },
            //success_url: success_url, // Replace with your success URL
            //cancel_url: cancel_url, // Replace with your cancel URL
          });
          console.log("Session:", session);
        } else {
          session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer: customer_id,
            success_url: success_url,
            // ui_mode: "embedded",
            // redirect_on_completion: "never",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Payment for subscription",
                  },
                  unit_amount: amount, // Сума платежу у центах (20 доларів)
                },
                quantity: 1,
              },
            ],
            metadata: {
              order_id: orderId, // Include the order_id as metadata
            },
            mode: "payment",
          });
          console.log("Session:", session);
        }

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
            amount: session.amount_total / 100,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ session: session });
      } else {
        //НЕ ПРОДУМАНО!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! - АПДЕЙТ В МИНУС
        // If the new plan is a downgrade
        // Cancel the current subscription
        console.log("WITH CANCEL");
        const currentSubscription = await stripe.subscriptions.list({
          customer: customer_id,
          limit: 1,
        });

        if (currentSubscription.data.length > 0) {
          // Cancel the current subscription
          await stripe.subscriptions.cancel(currentSubscription.data[0].id);
        }

        // Create a new Checkout Session for the new plan
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Payment for subscription",
                },
                unit_amount: amount, // Сума платежу у центах (20 доларів)
              },
              quantity: 1,
            },
          ],
          metadata: {
            order_id: orderId, // Include the order_id as metadata
          },
          mode: "payment",
        });
        console.log("Session:", session);

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ session: session });
      }
    } catch (error) {
      console.error("Subscription order error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async removeLicenses(req, res) {
    const { userId, licenseCount } = req.body;
    console.log("REQUEST", req.body);
    const company = await db("userlink").first("*").where({ user: userId });
    const customer = await db("company")
      .first("*")
      .where({ id: company.company });
    let customer_id = customer.customer_id;
    console.log("CUSTOMER ID", customer_id);
    const subscriptions = await stripe.subscriptions.list({
      customer: customer_id,
      status: "active",
      limit: 1, // Отримати лише одну активну підписку
    });
    let subscription_id;
    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0]; // Отримати першу (і, як ви сказали, єдину) підписку
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.id,
        {
          quantity: licenseCount,
          proration_behavior: "none",
        }
      );
      subscription_id = updatedSubscription.id;
      // Оновлено підписку
    } else {
      return res.status(400).json({ message: "error" });
    }
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: customer_id,
      subscription: subscription_id,
    });
    console.log("UPCOMING INVOICE", upcomingInvoice);
    const totalAmount = upcomingInvoice.amount_due;

    await db("company")
      .update({
        monthly_bill: totalAmount,
        payedLicense: licenseCount,
      })
      .where({ id: company.company });

    await db("metaenga_order_fondy")
      .update({
        licenseCount: licenseCount,
        amount: totalAmount,
      })
      .where({ order_company: company.company, order_status: "success" });

    return res.status(200).json({ message: "success" });
  }
  async orderSuccessCallback(req, res) {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = `${process.env.STRIPE_WEBHOOK_SECRET}`

    const type = "monthly";
    const typePayment = "order";

    let planArray = ["Free", "Standart", "Enterprise"];
    let event;
    console.log(req.body);

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("Error verifying webhook signature:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle webhook events
    switch (event.type) {
      case "customer.subscription.updated":
        console.log("SUBSCRIPTION UPDATED!");
        console.log(event.data.object);
        let data = event.data.object;
        let customerId = data.customer;

        try {
          let company = await db("company")
            .select("*")
            .where({ customer_id: customerId })
            .first();

          if (data.metadata.type === "flex") {
            for (let item of data.items.data) {
              let training = await db("trainings")
                .select("*")
                .where({ priceId: item.price.id })
                .first();

              if (!training) {
                continue;
              }

              let trainingAssignData = await db("metaenga_training_company")
                .first("*")
                .where({
                  company: company.id,
                  plan: "flex",
                  training: training.id,
                });

              if (!trainingAssignData) {
                const requestBody = {
                  company: company.id,
                  training: training.id,
                  headsets: item.quantity,
                };
                console.log("REQUEST BODY", requestBody);
                const response = await assignTrainingFlex(requestBody).catch(
                  (error) => {
                    console.log(error);
                  }
                );
              } else {
                await db("metaenga_training_company")
                  .update({
                    quantity: item.quantity,
                  })
                  .where({
                    company: company.id,
                    plan: "flex",
                    training: training.id,
                  });
              }
            }
            // let trainingsBySubscription = data.items.data.map((item) => ({
            //   priceId: item.price.id,
            //   quantity: item.quantity,
            // }));

            // console.log("RESULT ARRAY", trainingsBySubscription);

            // //if products have price_id price_1PbKiRACtPVEAgimR9fjW7HZ delete this product from array
            // trainingsBySubscription = trainingsBySubscription.filter(
            //   (item) => item.priceId !== "price_1PbKiRACtPVEAgimR9fjW7HZ"
            // );
            // console.log("RESULT ARRAY", trainingsBySubscription);
            // //get last added item quantity stripe

            // let headsets =
            //   trainingsBySubscription[trainingsBySubscription.length - 1]
            //     .quantity;

            // let assignedTrainings = await db("metaenga_training_company")
            //   .select("*")
            //   .where({ company: company.id, plan: "flex" });

            // let assignedTrainingsIds = assignedTrainings.map(
            //   (item) => item.training
            // );
            // console.log("ASSIGNED TRAININGS", assignedTrainingsIds);

            // const fetchTrainingIds = async () => {
            //   let promises = trainingsBySubscription.map(async (item) => {
            //     let training = await db("trainings")
            //       .select("*")
            //       .where({ priceId: item.priceId })
            //       .first();

            //     return training ? training.id : null;
            //   });

            //   let itemsArrayWithMetadataIds = (
            //     await Promise.all(promises)
            //   ).filter((id) => id !== null);
            //   console.log("TRAININGS TO ADD", itemsArrayWithMetadataIds);

            //   let trainingIdsToAdd = itemsArrayWithMetadataIds.filter(
            //     (id) => !assignedTrainingsIds.includes(id)
            //   );
            //   console.log("TRAINING IDS TO ADD", trainingIdsToAdd);

            //   for (const training of trainingIdsToAdd) {
            //     const requestBody = {
            //       company: company.id,
            //       training: training,
            //       headsets: headsets,
            //     };

            //     const response = await assignTrainingFlex(requestBody).catch(
            //       (error) => {
            //         console.log(error);
            //       }
            //     );
            //   }
            // };

            // await fetchTrainingIds();
          }
        } catch (error) {
          console.error("Error processing subscription update:", error);
        }

        // Handle other actions for successful payment...

        // await db("metaenga_payment_fondy").insert({
        //   payment_id: event.data.object.id,
        //   order_id: event.data.object.metadata.order_id,
        //   payment_status: event.data.object.status,
        //   payment_date: date,
        //   payment_type: "nested payment",
        //   payment_amount: event.data.object.amount_paid,
        // })

        break;
      case "invoice.paid":
        console.log("Payment successful!");
        console.log(event.data.object);
        // Handle other actions for successful payment...
        try {
          //add 5 seconds timeout
          const date = new Date().toISOString().slice(0, 19).replace("T", " ");
          const order_id =
            event.data.object.subscription_details.metadata.order_id;
          let TestDate = event.data.object.status_transitions.paid_at;
          TestDate = new Date(TestDate * 1000)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
          console.log("TEST DATE", TestDate);
          console.log("ORDER ID", order_id);
          // Access metadata associated with the subscription

          let check = await db("metaenga_order_fondy")
            .select("*")
            .where({ order_id: order_id, order_status: "success" })
            .first();
          if (check) {
            let company = await db("company")
              .select("*")
              .where({ id: check.order_company })
              .first();
            let PaymentType = company.billing_type;
            if (company.plan == "Flex") {
              let description = `Flex plan (${PaymentType.toLowerCase()})`;
              await db("metaenga_payment_fondy")
                .insert({
                  payment_id: event.data.object.id,
                  order_id: order_id,
                  payment_status: event.data.object.status,
                  payment_date: TestDate,
                  payment_type: "nested payment",
                  payment_amount: event.data.object.amount_paid,
                  payment_desc: description,
                  order_url: event.data.object.hosted_invoice_url,
                })
                .onConflict("payment_id")
                .ignore();
            } else {
              if(company.plan == "Enterprise"){
                let description = `Enterprise plan (${PaymentType.toLowerCase()})`;
                await db("metaenga_payment_fondy")
                  .insert({
                    payment_id: event.data.object.id,
                    order_id: order_id,
                    payment_status: event.data.object.status,
                    payment_date: TestDate,
                    payment_type: "nested payment",
                    payment_amount: event.data.object.amount_paid,
                    payment_desc: description,
                    order_url: event.data.object.hosted_invoice_url,
                  })
                  .onConflict("payment_id")
                  .ignore();
              }else{
                let description = `Strandard plan (${PaymentType.toLowerCase()})`;
                await db("metaenga_payment_fondy")
                  .insert({
                    payment_id: event.data.object.id,
                    order_id: order_id,
                    payment_status: event.data.object.status,
                    payment_date: TestDate,
                    payment_type: "nested payment",
                    payment_amount: event.data.object.amount_paid,
                    payment_desc: description,
                    order_url: event.data.object.hosted_invoice_url,
                  })
                  .onConflict("payment_id")
                  .ignore();
              }
             
            }
          } else {
            console.log("Order not found");
          }
        } catch (error) {
          console.log(error);
        }

        break;
      case "customer.subscription.created":
        console.log("Payment successful!");
        console.log(event.data.object);
        // Handle other actions for successful payment...

        break;
      case "customer.subscription.deleted":
        try {
          console.log("Payment failed!");
          console.log(event.data.object);
          const invoiceId = event.data.object.id;
          console.log("Canceled!");
          console.log("metadata order id", event.data.object.metadata.order_id);
          let orderIdD = event.data.object.metadata.order_id;

          let order = await db("metaenga_order_fondy")
            .select("*")
            .where({ order_id: orderIdD })
            .first();
          let company = await db("company")
            .select("*")
            .where({ id: order.order_company })
            .first();

          let companyId = company.id;
          let customer_id = company.customer_id;

          let licenseCount = 0;
          const date = new Date().toISOString().slice(0, 19).replace("T", " ");

          const orderId = await db("metaenga_order_fondy")
            .first("*")
            .where({ order_company: companyId, order_status: "success" });

          try {
            await db("metaenga_licenses_logs").insert({
              company_id: companyId,
              status: 0,
              date: date,
              count_licenses: orderId.licenseCount,
            });
          } catch (error) {
            console.log(error);
          }

          const requestBody = {
            company: companyId,
            newPlan: "Free",
          };

          const response = await updatePlan(requestBody).catch((error) => {
            console.log(error);
          });

          await db("metaenga_payment_fondy")
            .where({ order_id: orderId.order_id })
            .update({ payment_status: "stop" });
          await db("metaenga_order_fondy")
            .where({ order_id: orderId.order_id })
            .update({ order_status: "stop" });

          await db("company")
            .update({
              payedLicense: licenseCount,
              monthly_bill: null,
            })
            .where({ id: companyId });

          await db("metaenga_cancel_fondy").insert({
            status: "cancel",
            company_id: companyId,
          });
          break;
        } catch (error) {
          console.error("Error:", error);
          break;
        }

      case "customer.subscription.updated":
        console.log("Payment updated!");
        console.log(event.data.object);
        // Handle other actions for updated payment...
        break;
      case "customer.subscription.pending_update_expired":
        console.log("Payment pending_update_expired!");
        console.log(event.data.object);
        // Handle other actions for updated payment...
        break;
      case "customer.subscription.pending_update_applied":
        console.log("Payment pending_update_applied!");
        console.log(event.data.object);
        // Handle other actions for updated payment...
        break;
      case "customer.subscription.resumed":
        console.log("Payment resumed!");
        console.log(event.data.object);
        // Handle other actions for updated payment...
        break;
      case "customer.subscription.paused":
        console.log("Payment paused!");
        console.log(event.data.object);
        // Handle other actions for updated payment...
        break;
      case "customer.subscription.trial_will_end":
        console.log("Trial will end soon!");
        console.log(event.data.object);
        // Handle other actions for trial end...
        break;
      case "checkout.session.async_payment_succeeded":
        console.log("CHECKOUT successful!");
        console.log(event.data.object);

        break;
      case "checkout.session.async_payment_failed":
        console.log("CHECKOUT FAILED!");
        console.log(event.data.object);

        //
        break;
      case "checkout.session.completed":
        try {
          console.log("CHECKOUT COMPLETED!");
          console.log(event.data.object);
          let orderId = event.data.object.metadata.order_id;
          let subscription_type = event.data.object.metadata.type;
          let getOrderData = await db("metaenga_order_fondy")
          .first("*")
          .where({ order_id: event.data.object.metadata.order_id });
          if (subscription_type == "regular") {
            if(getOrderData.newPlan == "Enterprise"){
              let customer_id = event.data.object.customer;
            if (event.data.object.payment_intent != null) {
              const payment_intent_id = event.data.object.payment_intent;

              // Retrieve the payment intent to get the payment method ID
              const paymentIntent = await stripe.paymentIntents.retrieve(
                payment_intent_id
              );
              const payment_method_id = paymentIntent.payment_method;

              await stripe.paymentMethods.attach(payment_method_id, {
                customer: customer_id,
              });

              // Update the customer to set the new payment method as default
              await stripe.customers.update(customer_id, {
                invoice_settings: {
                  default_payment_method: payment_method_id,
                },
              });
            } else {
              let subscription_id = event.data.object.subscription;
              let get = await stripe.subscriptions.retrieve(subscription_id);
              let payment_method_id = get.default_payment_method;
              await stripe.paymentMethods.attach(payment_method_id, {
                customer: customer_id,
              });
              await stripe.customers.update(customer_id, {
                invoice_settings: {
                  default_payment_method: payment_method_id,
                },
              });
            }

            let newSub;
            const subs = await stripe.subscriptions.list({
              customer: customer_id,
              status: "active",
              limit: 1, // Отримати лише одну активну підписку
            });

            if (subs.data.length > 0) {
              newSub = false;
            } else {
              newSub = true;
            }

            //
            getOrderData = await db("metaenga_order_fondy")
              .first("*")
              .where({ order_id: event.data.object.metadata.order_id });

            let statusUpdate = getOrderData.statusUpdate;

            const date = new Date()
              .toISOString()
              .slice(0, 19)
              .replace("T", " ");
            try {
              await db("metaenga_licenses_logs").insert({
                company_id: getOrderData.order_company,
                count_licenses: getOrderData.licenseCount,
                date: date,
                status: 1,
              });
            } catch (error) {
              console.log(error);
            }
            if (getOrderData.newPlan == "Premium") return;
            let getOldPlan = await db("company")
              .first("plan")
              .where({ id: getOrderData.order_company });

            let check;
            const checkCancel = await db("metaenga_order_fondy")
              .first("*")
              .where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });

            const subscriptions = await stripe.subscriptions.list({
              customer: customer_id,
              status: "active",
              limit: 1, // Отримати лише одну активну підписку
            });
            let period;
            if (subscriptions.data.length == 0) {
              return res.json({ received: true });
            }
            console.log("SUBSCRIPTION", subscriptions.data[0].plan.id);
            if (
              subscriptions.data[0].plan.id == `${process.env.ENTERPRISE_PRICE}`
            ) {
              // month dev price_1P6B9EACtPVEAgimTtywPS0t month prod price_1P6BiZACtPVEAgimgftjgBSb
              period = "Monthly";
            } else if (
              subscriptions.data[0].plan.id == `${process.env.ENTERPRISE_PRICE_YEARLY}`
            ) {
              // year dev price_1P6B9EACtPVEAgimLn39sV6p year prod price_1P6BiZACtPVEAgimT5RCJDUm
              period = "Yearly";
            }
            let subscription_id;
            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0]; // Отримати першу (і, як ви сказали, єдину) підписку
              console.log("SUBSCRIPTION", subscription);
              if (subscription.metadata.order_id != null) {
                let OldMetadata = subscription.metadata.order_id;
                console.log("OLD METADATA", OldMetadata);
                console.log("NEW METADATA", orderId);
                await db("metaenga_payment_fondy")
                  .update({
                    order_id: orderId,
                  })
                  .where({ order_id: OldMetadata });
              }
              const updatedSubscription = await stripe.subscriptions.update(
                subscription.id,
                {
                  metadata: {
                    order_id: orderId,
                    type: "regular",
                  },
                  quantity: getOrderData.licenseCount,
                  proration_behavior: "none",
                }
              );
              subscription_id = updatedSubscription.id;

              // Оновлено підписку
            }

            let get = await stripe.subscriptions.retrieve(subscription_id);
            console.log("SUBSCRIPTION", get);

            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              customer: customer_id,
              subscription: subscription_id,
            });
            console.log("UPCOMING INVOICE", upcomingInvoice);
            const totalAmount = upcomingInvoice.amount_due;
            // Extract the price ID from the subscription object

            // let invoiceId = event.data.object.invoice;
            // const invoice = await stripe.invoices.retrieve(invoiceId);
            if (event.data.object.invoice != null) {
              const invoice = await stripe.invoices.retrieve(
                event.data.object.invoice
              );
              const hostedInvoiceUrl = invoice.hosted_invoice_url;
              if (statusUpdate == "update") {
                await db("metaenga_payment_fondy").insert({
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "update parent payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              } else if (statusUpdate == "increase") {
                await db("metaenga_payment_fondy").insert({
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "parent payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              } else if (statusUpdate == "VR created") {
                await db("metaenga_payment_fondy").insert({
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "VR parent payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              }
            } else {
              let getPreviousOrderId = await db("metaenga_order_fondy")
                .first("*")
                .where({
                  order_company: getOrderData.order_company,
                  order_status: "success",
                });

              if (getPreviousOrderId) {
                let getPreviousInvoiceId = await db("metaenga_payment_fondy")
                  .first("*")
                  .where({ order_id: getPreviousOrderId.order_id });
                if (getPreviousInvoiceId) {
                  await db("metaenga_payment_fondy")
                    .update({
                      order_id: event.data.object.metadata.order_id,
                    })
                    .where({ order_id: getPreviousOrderId.order_id });

                  if (statusUpdate == "update") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "update parent payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  } else if (statusUpdate == "increase") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "parent payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  } else if (statusUpdate == "VR created") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "VR parent payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  }
                }
              }
            }

            await db("company")
              .update({
                monthly_bill: totalAmount / 100,
              })
              .where({ id: getOrderData.order_company });

            if (!checkCancel) {
              check = await db("metaenga_order_fondy")
                .where({ order_company: getOrderData.order_company }) // Replace 'your_company_value' with the desired company value
                .orderBy("order_id", "desc") // Order by task_id in descending order to get the latest record
                .first(); // Get the first (latest) record
              console.log("CHECK 1 ", check);
            } else {
              check = await db("metaenga_order_fondy").first("*").where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });
              console.log("CHECK 2 ", check);
            }

            await db("metaenga_order_fondy")
              .update({ order_status: "stop" })
              .where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });
            await db("metaenga_order_fondy")
              .update({
                order_status: "success",
              })
              .where({ order_id: event.data.object.metadata.order_id });

            const paymentMethods = await stripe.paymentMethods.list({
              customer: customer_id,
              type: "card",
            });
            if (paymentMethods.data && paymentMethods.data.length > 0) {
              const card = paymentMethods.data[0].card;
              await db("metaenga_order_fondy")
                .update({
                  order_card: card.last4,
                  order_payment_system: card.brand,
                })
                .where({ order_id: event.data.object.metadata.order_id });
            }

            const requestBody = {
              company: getOrderData.order_company,
              newPlan: getOrderData.newPlan,
            };

            const cmp = await db("company")
              .first("*")
              .where({ id: getOrderData.order_company });
            const oldLicenses = cmp.payedLicense;

            //const oldLicenses = parseInt(result[0].oldLicenses, 10);

            const licenseCount = parseInt(getOrderData.licenseCount, 10);

            let newPlan = getOrderData.newPlan;
            let oldPlan = getOldPlan.plan;
            console.log("newPlan", newPlan);
            console.log("oldPlan", oldPlan);
            
            let newPlanIndex = planArray.indexOf(newPlan);
            let oldPlanIndex = planArray.indexOf(oldPlan);
            console.log("newPlanIndex AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", newPlanIndex);
            console.log("oldPlanIndex AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", oldPlanIndex);

            if (newPlanIndex > oldPlanIndex) {
              // if (licenseCount < 3) {
              //   //10
              //   await db("company")
              //     .update({
              //       payedLicense: licenseCount,
              //       billing_type: period,
              //     })
              //     .where({ id: getOrderData.order_company });
              //   const companyId = await db("company")
              //     .first("*")
              //     .where({ id: getOrderData.order_company });
              //   const creatorMail = companyId.userEmail;
              //   let userDB = getOrderData.order_company;
              //   await db("metaenga_users")
              //     .update({
              //       status: "DEACTIVATED",
              //     })
              //     .whereNot({ email: creatorMail })
              //     .where({ company_id: getOrderData.order_company });

              //   await db("metaenga_plan_insight")
              //     .update({
              //       companyUsersLimit: 1,
              //     })
              //     .where({ companyId: getOrderData.order_company });

              //   await db("metaenga_plan_insight")
              //     .update({
              //       companyUsersLimit: 1,
              //     })
              //     .where({ companyId: getOrderData.order_company });

              //   await db("metaenga_payment_fondy")
              //     .update({
              //       payment_desc: "Subscription standard purchase",
              //     })
              //     .where({ payment_id: event.data.object.invoice });

              //   //всюди над updatePlan викликати функцію лист від лупс
              //   // await sendReceipt(req.body, type, typePayment).catch(
              //   //   (error) => {
              //   //     console.log("Помилка у функції sendReceipt:", error);
              //   //   }
              //   // );
              //   const requestBody = {
              //     company: getOrderData.order_company,
              //     newPlan: getOrderData.newPlan,
              //   };

              //   const response = await updatePlan(requestBody).catch((error) => {
              //     console.log(error);
              //   });
              //   await db("metaenga_cron")
              //     .where({ company: getOrderData.order_company })
              //     .del();
              // }
              if (licenseCount >= 1) {
                //11
                console.log("AAAAAAAAAAAAAAAAAA INCREASE LICENSES");
                await db("company")
                  .update({
                    payedLicense: licenseCount,
                    billing_type: period,
                  })
                  .where({ id: getOrderData.order_company });
                // await sendReceipt(req.body, type, typePayment).catch(
                //   (error) => {
                //     console.log("Помилка у функції sendReceipt:", error);
                //   }
                // );
                const requestBody = {
                  company: getOrderData.order_company,
                  newPlan: getOrderData.newPlan,
                };
                console.log(requestBody)
                const response = await updatePlan(requestBody).catch(
                  (error) => {
                    console.log(error);
                  }
                );
                console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                console.log(response)

                await db("metaenga_payment_fondy")
                  .update({
                    payment_desc: "Subscription enterprise purchase",
                  })
                  .where({ payment_id: event.data.object.invoice });

                await db("metaenga_cron")
                  .where({ company: getOrderData.order_company })
                  .del();
              }
            }

            if (newPlanIndex == oldPlanIndex) {
              if (oldLicenses <= licenseCount) {
                //4 + cancel subscription
                console.log("AAAAAAAAAAAAAAAAAA INCREASE LICENSES");
                if (checkCancel) {
                  let previousOrderId = check.order_id;

                  console.log("AAAAAAAA");
                  console.log(previousOrderId);
                  await db("metaenga_payment_fondy")
                    .where({ order_id: previousOrderId })
                    .update({ payment_status: "stop" });
                  console.log("CANCEL SUBSCRIPTION");
                  let subscriptionId;
                  // const subscriptions = await stripe.subscriptions.list({ customer: customer_id }); // Отримати список підписок для певного клієнта
                  // console.log("SUBSCRIPTION LIST", subscriptions);
                  // console.log("PREVIOUS ORDER ID", previousOrderId);
                  // for (const subscription of subscriptions.data) {
                  //    console.log("SUBSCRIPTION METADATA", subscription.metadata);
                  //    console.log("SUBSCRIPTION ID", subscription.id);
                  //     if (subscription.metadata.order_id == previousOrderId) {
                  //         console.log("SUBSCRIPTION ID", subscription.id);
                  //         console.log("SUBSCRIPTION METADATA", subscription.metadata);

                  //         subscriptionId = subscription.id;
                  //     }
                  // }
                  // console.log("SUBSCRIPTION ID", subscriptionId);
                  // await stripe.subscriptions.cancel(subscriptionId); // Скасувати підписку
                }
                await db("company")
                  .update({
                    payedLicense: licenseCount,
                    billing_type: period,
                  })
                  .where({ id: getOrderData.order_company });

                const customer_id = await db("company")
                  .select("customer_id")
                  .where({ id: getOrderData.order_company })
                  .first();

                const invoices = await stripe.invoices.list({
                  limit: 1,
                  status: "paid",
                  customer: customer_id.customer_id,
                });

                let url = invoices.data[0].hosted_invoice_url;

                await db("metaenga_payment_fondy")
                  .update({
                    payment_desc: "Update Standard plan, additional licenses",
                    order_url: url,
                  })
                  .where({ payment_id: event.data.object.invoice });

                const response = await updatePlan(requestBody).catch(
                  (error) => {
                    console.log(error);
                  }
                );
                await db("metaenga_cron")
                  .where({ company: getOrderData.order_company })
                  .del();
                console.log(
                  "AAAAAAAAAAAAAAAAAA STATUS",
                  getOrderData.statusUpdate
                );

                // const updateSubscriptionStripe = await stripe.subscriptions.update(
                //   subscription_id,
                //   {
                //     metadata: {
                //       order_id: orderId,
                //     },
                //     quantity: licenseCount,
                //   }
                // );
                // console.log("AAAAAAAAAAAAAAAAAA UPDATE SUBSCRIPTION", updateSubscriptionStripe);
              }
              if (oldLicenses > licenseCount) {
                //5 переработанный вариант, работает после удаленных пользователей
                console.log("AAAAAAAAAAAAAAAAAA DECREASE LICENSES");
                if (checkCancel) {
                  let previousOrderId = check.order_id;

                  console.log("AAAAAAAA");
                  console.log(previousOrderId);
                  await db("metaenga_payment_fondy")
                    .where({ order_id: previousOrderId })
                    .update({ payment_status: "stop" });
                  console.log("CANCEL SUBSCRIPTION");
                  // const subscriptions = await stripe.subscriptions.list({ customer: customer_id }); // Отримати список підписок для певного клієнта
                  // console.log("SUBSCRIPTION LIST", subscriptions.data.metadata);
                  // let subscriptionId
                  // console.log("PREVIOUS ORDER ID", previousOrderId);
                  // for (const subscription of subscriptions.data) {
                  //     if (subscription.metadata.order_id === previousOrderId) {
                  //         subscriptionId = subscription.id;
                  //     }
                  // }
                  // console.log("SUBSCRIPTION ID", subscriptionId);
                  // await stripe.subscriptions.cancel(subscriptionId); // Скасувати підписку
                }
                await db("company")
                  .update({
                    payedLicense: licenseCount,
                    billing_type: period,
                  })
                  .where({ id: getOrderData.order_company });

                const customer_id = await db("company")
                  .select("customer_id")
                  .where({ id: getOrderData.order_company })
                  .first();

                const invoices = await stripe.invoices.list({
                  limit: 1,
                  status: "paid",
                  customer: customer_id.customer_id,
                });

                let url = invoices.data[0].hosted_invoice_url;

                await db("metaenga_payment_fondy")
                  .update({
                    payment_desc: "Update Standard plan, additional licenses",
                    order_url: url,
                  })
                  .where({ payment_id: event.data.object.invoice });

                const response = await updatePlan(requestBody).catch(
                  (error) => {
                    console.log(error);
                  }
                );
                await db("metaenga_cron")
                  .where({ company: getOrderData.order_company })
                  .del();
              }
            }
            }else{ //STANDARD
              let customer_id = event.data.object.customer;
            if (event.data.object.payment_intent != null) {
              const payment_intent_id = event.data.object.payment_intent;

              // Retrieve the payment intent to get the payment method ID
              const paymentIntent = await stripe.paymentIntents.retrieve(
                payment_intent_id
              );
              const payment_method_id = paymentIntent.payment_method;

              await stripe.paymentMethods.attach(payment_method_id, {
                customer: customer_id,
              });

              // Update the customer to set the new payment method as default
              await stripe.customers.update(customer_id, {
                invoice_settings: {
                  default_payment_method: payment_method_id,
                },
              });
            } else {
              let subscription_id = event.data.object.subscription;
              let get = await stripe.subscriptions.retrieve(subscription_id);
              let payment_method_id = get.default_payment_method;
              await stripe.paymentMethods.attach(payment_method_id, {
                customer: customer_id,
              });
              await stripe.customers.update(customer_id, {
                invoice_settings: {
                  default_payment_method: payment_method_id,
                },
              });
            }

            let newSub;
            const subs = await stripe.subscriptions.list({
              customer: customer_id,
              status: "active",
              limit: 1, // Отримати лише одну активну підписку
            });

            if (subs.data.length > 0) {
              newSub = false;
            } else {
              newSub = true;
            }

            //
            getOrderData = await db("metaenga_order_fondy")
              .first("*")
              .where({ order_id: event.data.object.metadata.order_id });

            let statusUpdate = getOrderData.statusUpdate;

            const date = new Date()
              .toISOString()
              .slice(0, 19)
              .replace("T", " ");
            try {
              await db("metaenga_licenses_logs").insert({
                company_id: getOrderData.order_company,
                count_licenses: getOrderData.licenseCount,
                date: date,
                status: 1,
              });
            } catch (error) {
              console.log(error);
            }
            if (getOrderData.newPlan == "Premium") return;
            let getOldPlan = await db("company")
              .first("plan")
              .where({ id: getOrderData.order_company });

            let check;
            const checkCancel = await db("metaenga_order_fondy")
              .first("*")
              .where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });

            const subscriptions = await stripe.subscriptions.list({
              customer: customer_id,
              status: "active",
              limit: 1, // Отримати лише одну активну підписку
            });
            let period;
            if (subscriptions.data.length == 0) {
              return res.json({ received: true });
            }
            console.log("SUBSCRIPTION", subscriptions.data[0].plan.id);
            if (
              subscriptions.data[0].plan.id == `${process.env.MONTHLY_PRICE}`
            ) {
              // month dev price_1P6B9EACtPVEAgimTtywPS0t month prod price_1P6BiZACtPVEAgimgftjgBSb
              period = "Monthly";
            } else if (
              subscriptions.data[0].plan.id == `${process.env.YEARLY_PRICE}`
            ) {
              // year dev price_1P6B9EACtPVEAgimLn39sV6p year prod price_1P6BiZACtPVEAgimT5RCJDUm
              period = "Yearly";
            }
            let subscription_id;
            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0]; // Отримати першу (і, як ви сказали, єдину) підписку
              console.log("SUBSCRIPTION", subscription);
              if (subscription.metadata.order_id != null) {
                let OldMetadata = subscription.metadata.order_id;
                console.log("OLD METADATA", OldMetadata);
                console.log("NEW METADATA", orderId);
                await db("metaenga_payment_fondy")
                  .update({
                    order_id: orderId,
                  })
                  .where({ order_id: OldMetadata });
              }
              const updatedSubscription = await stripe.subscriptions.update(
                subscription.id,
                {
                  metadata: {
                    order_id: orderId,
                    type: "regular",
                  },
                  quantity: getOrderData.licenseCount,
                  proration_behavior: "none",
                }
              );
              subscription_id = updatedSubscription.id;

              // Оновлено підписку
            }

            let get = await stripe.subscriptions.retrieve(subscription_id);
            console.log("SUBSCRIPTION", get);

            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              customer: customer_id,
              subscription: subscription_id,
            });
            console.log("UPCOMING INVOICE", upcomingInvoice);
            const totalAmount = upcomingInvoice.amount_due;
            // Extract the price ID from the subscription object

            // let invoiceId = event.data.object.invoice;
            // const invoice = await stripe.invoices.retrieve(invoiceId);
            if (event.data.object.invoice != null) {
              const invoice = await stripe.invoices.retrieve(
                event.data.object.invoice
              );
              const hostedInvoiceUrl = invoice.hosted_invoice_url;
              if (statusUpdate == "update") {
                await db("metaenga_payment_fondy").insert({
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "update parent payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              } else if (statusUpdate == "increase") {
                await db("metaenga_payment_fondy").insert({
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "parent payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              } else if (statusUpdate == "VR created") {
                await db("metaenga_payment_fondy").insert({
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "VR parent payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              }
            } else {
              let getPreviousOrderId = await db("metaenga_order_fondy")
                .first("*")
                .where({
                  order_company: getOrderData.order_company,
                  order_status: "success",
                });

              if (getPreviousOrderId) {
                let getPreviousInvoiceId = await db("metaenga_payment_fondy")
                  .first("*")
                  .where({ order_id: getPreviousOrderId.order_id });
                if (getPreviousInvoiceId) {
                  await db("metaenga_payment_fondy")
                    .update({
                      order_id: event.data.object.metadata.order_id,
                    })
                    .where({ order_id: getPreviousOrderId.order_id });

                  if (statusUpdate == "update") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "update parent payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  } else if (statusUpdate == "increase") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "parent payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  } else if (statusUpdate == "VR created") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "VR parent payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  }
                }
              }
            }

            await db("company")
              .update({
                monthly_bill: totalAmount / 100,
              })
              .where({ id: getOrderData.order_company });

            if (!checkCancel) {
              check = await db("metaenga_order_fondy")
                .where({ order_company: getOrderData.order_company }) // Replace 'your_company_value' with the desired company value
                .orderBy("order_id", "desc") // Order by task_id in descending order to get the latest record
                .first(); // Get the first (latest) record
              console.log("CHECK 1 ", check);
            } else {
              check = await db("metaenga_order_fondy").first("*").where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });
              console.log("CHECK 2 ", check);
            }

            await db("metaenga_order_fondy")
              .update({ order_status: "stop" })
              .where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });
            await db("metaenga_order_fondy")
              .update({
                order_status: "success",
              })
              .where({ order_id: event.data.object.metadata.order_id });

            const paymentMethods = await stripe.paymentMethods.list({
              customer: customer_id,
              type: "card",
            });
            if (paymentMethods.data && paymentMethods.data.length > 0) {
              const card = paymentMethods.data[0].card;
              await db("metaenga_order_fondy")
                .update({
                  order_card: card.last4,
                  order_payment_system: card.brand,
                })
                .where({ order_id: event.data.object.metadata.order_id });
            }

            const requestBody = {
              company: getOrderData.order_company,
              newPlan: getOrderData.newPlan,
            };

            const cmp = await db("company")
              .first("*")
              .where({ id: getOrderData.order_company });
            const oldLicenses = cmp.payedLicense;

            //const oldLicenses = parseInt(result[0].oldLicenses, 10);

            const licenseCount = parseInt(getOrderData.licenseCount, 10);

            let newPlan = getOrderData.newPlan;
            let oldPlan = getOldPlan.plan;
            let newPlanIndex = planArray.indexOf(newPlan);
            let oldPlanIndex = planArray.indexOf(oldPlan);

            if (newPlanIndex > oldPlanIndex) {
              // if (licenseCount < 3) {
              //   //10
              //   await db("company")
              //     .update({
              //       payedLicense: licenseCount,
              //       billing_type: period,
              //     })
              //     .where({ id: getOrderData.order_company });
              //   const companyId = await db("company")
              //     .first("*")
              //     .where({ id: getOrderData.order_company });
              //   const creatorMail = companyId.userEmail;
              //   let userDB = getOrderData.order_company;
              //   await db("metaenga_users")
              //     .update({
              //       status: "DEACTIVATED",
              //     })
              //     .whereNot({ email: creatorMail })
              //     .where({ company_id: getOrderData.order_company });

              //   await db("metaenga_plan_insight")
              //     .update({
              //       companyUsersLimit: 1,
              //     })
              //     .where({ companyId: getOrderData.order_company });

              //   await db("metaenga_plan_insight")
              //     .update({
              //       companyUsersLimit: 1,
              //     })
              //     .where({ companyId: getOrderData.order_company });

              //   await db("metaenga_payment_fondy")
              //     .update({
              //       payment_desc: "Subscription standard purchase",
              //     })
              //     .where({ payment_id: event.data.object.invoice });

              //   //всюди над updatePlan викликати функцію лист від лупс
              //   // await sendReceipt(req.body, type, typePayment).catch(
              //   //   (error) => {
              //   //     console.log("Помилка у функції sendReceipt:", error);
              //   //   }
              //   // );
              //   const requestBody = {
              //     company: getOrderData.order_company,
              //     newPlan: getOrderData.newPlan,
              //   };

              //   const response = await updatePlan(requestBody).catch((error) => {
              //     console.log(error);
              //   });
              //   await db("metaenga_cron")
              //     .where({ company: getOrderData.order_company })
              //     .del();
              // }
              if (licenseCount >= 1) {
                //11
                await db("company")
                  .update({
                    payedLicense: licenseCount,
                    billing_type: period,
                  })
                  .where({ id: getOrderData.order_company });
                // await sendReceipt(req.body, type, typePayment).catch(
                //   (error) => {
                //     console.log("Помилка у функції sendReceipt:", error);
                //   }
                // );
                const requestBody = {
                  company: getOrderData.order_company,
                  newPlan: getOrderData.newPlan,
                };

                const response = await updatePlan(requestBody).catch(
                  (error) => {
                    console.log(error);
                  }
                );

                await db("metaenga_payment_fondy")
                  .update({
                    payment_desc: "Subscription standard purchase",
                  })
                  .where({ payment_id: event.data.object.invoice });

                await db("metaenga_cron")
                  .where({ company: getOrderData.order_company })
                  .del();
              }
            }

            if (newPlanIndex == oldPlanIndex) {
              if (oldLicenses <= licenseCount) {
                //4 + cancel subscription
                console.log("AAAAAAAAAAAAAAAAAA INCREASE LICENSES");
                if (checkCancel) {
                  let previousOrderId = check.order_id;

                  console.log("AAAAAAAA");
                  console.log(previousOrderId);
                  await db("metaenga_payment_fondy")
                    .where({ order_id: previousOrderId })
                    .update({ payment_status: "stop" });
                  console.log("CANCEL SUBSCRIPTION");
                  let subscriptionId;
                  // const subscriptions = await stripe.subscriptions.list({ customer: customer_id }); // Отримати список підписок для певного клієнта
                  // console.log("SUBSCRIPTION LIST", subscriptions);
                  // console.log("PREVIOUS ORDER ID", previousOrderId);
                  // for (const subscription of subscriptions.data) {
                  //    console.log("SUBSCRIPTION METADATA", subscription.metadata);
                  //    console.log("SUBSCRIPTION ID", subscription.id);
                  //     if (subscription.metadata.order_id == previousOrderId) {
                  //         console.log("SUBSCRIPTION ID", subscription.id);
                  //         console.log("SUBSCRIPTION METADATA", subscription.metadata);

                  //         subscriptionId = subscription.id;
                  //     }
                  // }
                  // console.log("SUBSCRIPTION ID", subscriptionId);
                  // await stripe.subscriptions.cancel(subscriptionId); // Скасувати підписку
                }
                await db("company")
                  .update({
                    payedLicense: licenseCount,
                    billing_type: period,
                  })
                  .where({ id: getOrderData.order_company });

                const customer_id = await db("company")
                  .select("customer_id")
                  .where({ id: getOrderData.order_company })
                  .first();

                const invoices = await stripe.invoices.list({
                  limit: 1,
                  status: "paid",
                  customer: customer_id.customer_id,
                });

                let url = invoices.data[0].hosted_invoice_url;

                await db("metaenga_payment_fondy")
                  .update({
                    payment_desc: "Update Standard plan, additional licenses",
                    order_url: url,
                  })
                  .where({ payment_id: event.data.object.invoice });

                const response = await updatePlan(requestBody).catch(
                  (error) => {
                    console.log(error);
                  }
                );
                await db("metaenga_cron")
                  .where({ company: getOrderData.order_company })
                  .del();
                console.log(
                  "AAAAAAAAAAAAAAAAAA STATUS",
                  getOrderData.statusUpdate
                );

                // const updateSubscriptionStripe = await stripe.subscriptions.update(
                //   subscription_id,
                //   {
                //     metadata: {
                //       order_id: orderId,
                //     },
                //     quantity: licenseCount,
                //   }
                // );
                // console.log("AAAAAAAAAAAAAAAAAA UPDATE SUBSCRIPTION", updateSubscriptionStripe);
              }
              if (oldLicenses > licenseCount) {
                //5 переработанный вариант, работает после удаленных пользователей
                console.log("AAAAAAAAAAAAAAAAAA DECREASE LICENSES");
                if (checkCancel) {
                  let previousOrderId = check.order_id;

                  console.log("AAAAAAAA");
                  console.log(previousOrderId);
                  await db("metaenga_payment_fondy")
                    .where({ order_id: previousOrderId })
                    .update({ payment_status: "stop" });
                  console.log("CANCEL SUBSCRIPTION");
                  // const subscriptions = await stripe.subscriptions.list({ customer: customer_id }); // Отримати список підписок для певного клієнта
                  // console.log("SUBSCRIPTION LIST", subscriptions.data.metadata);
                  // let subscriptionId
                  // console.log("PREVIOUS ORDER ID", previousOrderId);
                  // for (const subscription of subscriptions.data) {
                  //     if (subscription.metadata.order_id === previousOrderId) {
                  //         subscriptionId = subscription.id;
                  //     }
                  // }
                  // console.log("SUBSCRIPTION ID", subscriptionId);
                  // await stripe.subscriptions.cancel(subscriptionId); // Скасувати підписку
                }
                await db("company")
                  .update({
                    payedLicense: licenseCount,
                    billing_type: period,
                  })
                  .where({ id: getOrderData.order_company });

                const customer_id = await db("company")
                  .select("customer_id")
                  .where({ id: getOrderData.order_company })
                  .first();

                const invoices = await stripe.invoices.list({
                  limit: 1,
                  status: "paid",
                  customer: customer_id.customer_id,
                });

                let url = invoices.data[0].hosted_invoice_url;

                await db("metaenga_payment_fondy")
                  .update({
                    payment_desc: "Update Standard plan, additional licenses",
                    order_url: url,
                  })
                  .where({ payment_id: event.data.object.invoice });

                const response = await updatePlan(requestBody).catch(
                  (error) => {
                    console.log(error);
                  }
                );
                await db("metaenga_cron")
                  .where({ company: getOrderData.order_company })
                  .del();
              }
            }
            }
          } else if (subscription_type == "flex") {
            let customer_id = event.data.object.customer;
            if (event.data.object.payment_intent != null) {
              const payment_intent_id = event.data.object.payment_intent;

              // Retrieve the payment intent to get the payment method ID
              const paymentIntent = await stripe.paymentIntents.retrieve(
                payment_intent_id
              );
              const payment_method_id = paymentIntent.payment_method;

              await stripe.paymentMethods.attach(payment_method_id, {
                customer: customer_id,
              });

              // Update the customer to set the new payment method as default
              await stripe.customers.update(customer_id, {
                // Оновити клієнта, щоб встановити новий спосіб оплати за замовчуванням
                invoice_settings: {
                  default_payment_method: payment_method_id,
                },
              });
            } else {
              let subscription_id = event.data.object.subscription;
              let get = await stripe.subscriptions.retrieve(subscription_id);
              let payment_method_id = get.default_payment_method;
              await stripe.paymentMethods.attach(payment_method_id, {
                // Прикріпити спосіб оплати до клієнта
                customer: customer_id,
              });
              await stripe.customers.update(customer_id, {
                // Оновити клієнта, щоб встановити новий спосіб оплати за замовчуванням
                invoice_settings: {
                  default_payment_method: payment_method_id,
                },
              });
            }

            let newSub;
            const subs = await stripe.subscriptions.list({
              // Отримати список підписок для певного клієнта
              customer: customer_id,
              status: "active",
              limit: 1, // Отримати лише одну активну підписку
            });

            if (subs.data.length > 0) {
              // Якщо підписка існує
              newSub = false;
            } else {
              newSub = true;
            }

            //
            const getOrderData = await db("metaenga_order_fondy") // Отримати дані замовлення
              .first("*")
              .where({ order_id: event.data.object.metadata.order_id });

            let statusUpdate = getOrderData.statusUpdate; // Отримати статус оновлення

            const date = new Date()
              .toISOString()
              .slice(0, 19)
              .replace("T", " ");
            try {
              await db("metaenga_licenses_logs").insert({
                // Вставити дані в логи ліцензій
                company_id: getOrderData.order_company,
                count_licenses: getOrderData.licenseCount,
                date: date,
                status: 1,
              });
            } catch (error) {
              console.log(error);
            }
            if (getOrderData.newPlan == "Premium") return;
            let getOldPlan = await db("company") // Отримати старий план
              .first("plan")
              .where({ id: getOrderData.order_company });

            let check;
            const checkCancel = await db("metaenga_order_fondy")
              .first("*")
              .where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });

            const subscriptions = await stripe.subscriptions.list({
              customer: customer_id,
              status: "active",
              limit: 1, // Отримати лише одну активну підписку
            });
            let period;
            if (subscriptions.data.length == 0) {
              // Якщо підписка не існує
              return res.json({ received: true });
            }
            console.log("SUBSCRIPTION", subscriptions.data[0]);
            console.log("CUSTOMER", customer_id);
            // console.log("SUBSCRIPTION", subscriptions.data[0].plan.id);
            period = "Monthly";

            let subscription_id;
            if (subscriptions.data.length > 0) {
              const subscription = subscriptions.data[0]; // Отримати першу і єдину підписку
              console.log("SUBSCRIPTION", subscription);
              if (subscription.metadata.order_id != null) {
                // Якщо метадані підписки не дорівнюють нулю
                let OldMetadata = subscription.metadata.order_id;
                console.log("OLD METADATA", OldMetadata);
                console.log("NEW METADATA", orderId);
                await db("metaenga_payment_fondy")
                  .update({
                    order_id: orderId,
                  })
                  .where({ order_id: OldMetadata });
              }
              const updatedSubscription = await stripe.subscriptions.update(
                // Оновити підписку
                subscription.id,
                {
                  metadata: {
                    order_id: orderId, // Оновити метадані підписки
                    type: "flex", // Тип підписки
                  },
                  // quantity: getOrderData.licenseCount, // Кількість ліцензій
                  proration_behavior: "none", // Поведінка прорахунку
                }
              );
              subscription_id = updatedSubscription.id;

              // Оновлено підписку
            }

            let get = await stripe.subscriptions.retrieve(subscription_id);
            console.log("SUBSCRIPTION", get);

            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              // Отримати наступний рахунок
              customer: customer_id,
              subscription: subscription_id,
            });
            console.log("UPCOMING INVOICE", upcomingInvoice);
            const totalAmount = upcomingInvoice.amount_due;
            // Extract the price ID from the subscription object

            // let invoiceId = event.data.object.invoice;
            // const invoice = await stripe.invoices.retrieve(invoiceId);
            if (event.data.object.invoice != null) {
              const invoice = await stripe.invoices.retrieve(
                event.data.object.invoice
              );
              const hostedInvoiceUrl = invoice.hosted_invoice_url; // Отримати URL рахунку
              if (statusUpdate == "update") {
                await db("metaenga_payment_fondy").insert({
                  // Вставити дані про платіж
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "update payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              } else if (statusUpdate == "increase") {
                await db("metaenga_payment_fondy").insert({
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "parent payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              } else if (statusUpdate == "VR created") {
                await db("metaenga_payment_fondy").insert({
                  payment_id: event.data.object.invoice,
                  order_id: event.data.object.metadata.order_id,
                  payment_status: event.data.object.payment_status,
                  payment_date: new Date(),
                  payment_type: "VR parent payment",
                  payment_amount: getOrderData.amount,
                  order_url: hostedInvoiceUrl,
                });
              }
            } else {
              let getPreviousOrderId = await db("metaenga_order_fondy")
                .first("*")
                .where({
                  order_company: getOrderData.order_company,
                  order_status: "success",
                });

              if (getPreviousOrderId) {
                let getPreviousInvoiceId = await db("metaenga_payment_fondy")
                  .first("*")
                  .where({ order_id: getPreviousOrderId.order_id });
                if (getPreviousInvoiceId) {
                  await db("metaenga_payment_fondy")
                    .update({
                      order_id: event.data.object.metadata.order_id,
                    })
                    .where({ order_id: getPreviousOrderId.order_id });

                  if (statusUpdate == "update") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "update payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  } else if (statusUpdate == "increase") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "parent payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  } else if (statusUpdate == "VR created") {
                    await db("metaenga_payment_fondy").insert({
                      payment_id: event.data.object.invoice,
                      order_id: event.data.object.metadata.order_id,
                      payment_status: event.data.object.payment_status,
                      payment_date: new Date(),
                      payment_type: "VR parent payment",
                      payment_amount: getOrderData.amount,
                      //order_url: hostedInvoiceUrl
                    });
                  }
                }
              }
            }

            await db("company")
              .update({
                monthly_bill: totalAmount / 100,
              })
              .where({ id: getOrderData.order_company });

            if (!checkCancel) {
              check = await db("metaenga_order_fondy")
                .where({ order_company: getOrderData.order_company }) // Replace 'your_company_value' with the desired company value
                .orderBy("order_id", "desc") // Order by task_id in descending order to get the latest record
                .first(); // Get the first (latest) record
              console.log("CHECK 1 ", check);
            } else {
              check = await db("metaenga_order_fondy").first("*").where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });
              console.log("CHECK 2 ", check);
            }

            await db("metaenga_order_fondy")
              .update({ order_status: "stop" })
              .where({
                order_company: getOrderData.order_company,
                order_status: "success",
              });
            await db("metaenga_order_fondy")
              .update({
                order_status: "success",
              })
              .where({ order_id: event.data.object.metadata.order_id });

            const paymentMethods = await stripe.paymentMethods.list({
              customer: customer_id,
              type: "card",
            });
            if (paymentMethods.data && paymentMethods.data.length > 0) {
              const card = paymentMethods.data[0].card;
              await db("metaenga_order_fondy")
                .update({
                  order_card: card.last4,
                  order_payment_system: card.brand,
                })
                .where({ order_id: event.data.object.metadata.order_id });
            }

            const requestBody = {
              company: getOrderData.order_company,
              newPlan: getOrderData.newPlan,
            };

            const cmp = await db("company")
              .first("*")
              .where({ id: getOrderData.order_company });
            const oldLicenses = cmp.payedLicense;

            //const oldLicenses = parseInt(result[0].oldLicenses, 10);

            const licenseCount = parseInt(getOrderData.licenseCount, 10);

            let newPlan = getOrderData.newPlan;
            let oldPlan = getOldPlan.plan;

            if (newPlan == "Flex" && oldPlan == "Free") {
              if (licenseCount >= 1) {
                //11
                await db("company")
                  .update({
                    payedLicense: licenseCount,
                    billing_type: period,
                  })
                  .where({ id: getOrderData.order_company });
                // await sendReceipt(req.body, type, typePayment).catch(
                //   (error) => {
                //     console.log("Помилка у функції sendReceipt:", error);
                //   }
                // );
                const subscriptions = await stripe.subscriptions.list({
                  customer: customer_id,
                  limit: 1, // Adjust the limit as needed
                });
                const productIds = new Set();

                // Extract product IDs from the subscription items
                subscriptions.data.forEach((subscription) => {
                  subscription.items.data.forEach((item) => {
                    productIds.add(item.price.product);
                  });
                });

                // Fetch product details
                const products = [];
                for (const productId of productIds) {
                  const product = await stripe.products.retrieve(productId);
                  products.push(product);
                }
                //if products have price_id price_1PbKiRACtPVEAgimR9fjW7HZ delete this product from array
                console.log("PRODUUUUCTS", products);
                for (let i = 0; i < products.length; i++) {
                  if (
                    products[i].default_price ==
                    `${process.env.VIDEO_PRICE}` //video price prod price_1PixOkACtPVEAgimLfOH880V dev price_1PbKiRACtPVEAgimR9fjW7HZ
                  ) {
                    products.splice(i, 1);
                  }
                }

                //assign flex plan
                const requestBody = {
                  company: getOrderData.order_company,
                  newPlan: "Flex",
                };
                const response = await updatePlan(requestBody).catch(
                  (error) => {
                    console.log(error);
                  }
                );

                // Log the list of products
                console.log(products);
                for (const product of products) {
                  const requestBody = {
                    company: getOrderData.order_company,
                    training: product.metadata.id,
                    headsets: getOrderData.licenseCount,
                  };

                  const response = await assignTrainingFlex(requestBody).catch(
                    (error) => {
                      console.log(error);
                    }
                  );
                }

                await db("metaenga_payment_fondy")
                  .update({
                    payment_desc: "Subscription flex purchase",
                  })
                  .where({ payment_id: event.data.object.invoice });

                await db("metaenga_cron")
                  .where({ company: getOrderData.order_company })
                  .del();
              }
            }
          }

          //
          break;
        } catch (error) {
          console.error("Error:", error);
          res.json({ received: true });
          break;
        }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  }

  async orderYear(req, res) {
    try {
      const {
        userId,
        licenseCount,
        mail,
        description,
        amount,
        newPlan,
        status,
        success_url,
        cancel_url,
      } = req.body;

      let customer_id;

      // Define your plans array and get the current and new plan indices
      const planArray = ["Free", "Standart", "Premium"];

      const company = await db("userlink").first("*").where({ user: userId });
      const companyPlan = await db("company")
        .first("*")
        .where({ id: company.company });

      //check if customer has subscription in stripe
      //
      if (companyPlan.customer_id) {
        customer_id = companyPlan.customer_id;
      } else {
        const customer = await stripe.customers.create({
          email: mail,
          name: companyPlan.name,
        });
        customer_id = customer.id;
        await db("company")
          .update({ customer_id: customer_id })
          .where({ id: company.company });
      }

      let subscrCheck = await stripe.subscriptions.list({
        customer: customer_id,
        status: "active",
        limit: 1, // Отримати лише одну активну підписку
      });

      let newSub;

      if (subscrCheck.data.length > 0) {
        newSub = false;
      } else {
        newSub = true;
      }

      const companyIndex = planArray.indexOf(companyPlan.plan);
      console.log("Company Index:", companyPlan.plan);
      const newPlanIndex = planArray.indexOf(newPlan);
      console.log("New Plan Index:", newPlan);

      await db("metaenga_order_fondy")
        .where({ order_company: company.company, order_status: "created" })
        .andWhere({ order_company: company.company, order_status: "stop" })
        .del();

      // Create a new order in your database
      const orderArr = await db("metaenga_order_fondy")
        .insert({
          order_status: "created",
          order_date: new Date(),
          amount: amount,
          currency: "USD",
          licenseCount: licenseCount,
          mail: mail,
          order_desc: description,
          order_company: company.company,
          newPlan: newPlan,
        })
        .returning("order_id");
      const orderId = orderArr[0];

      // If the new plan is an upgrade or the same as the current plan
      console.log("Company Index:", companyIndex);
      console.log("New Plan Index:", newPlanIndex);
      if (companyIndex <= newPlanIndex) {
        // Create a new Checkout Session
        console.log("DEFAULT");
        let session;
        if (newSub) {
          session = await stripe.checkout.sessions.create({
            customer: customer_id,
            mode: "subscription",
            payment_method_types: ["card"],
            ui_mode: "embedded",
            line_items: [
              {
                price: `${process.env.YEARLY_PRICE}`, // year dev price_1P6B9EACtPVEAgimLn39sV6p year prod price_1P6BiZACtPVEAgimT5RCJDUm
                quantity: licenseCount,
              },
            ],
            redirect_on_completion: "never", // Replace with your return URL
            metadata: {
              type: "regular",
              order_id: orderId, // Include the order_id as metadata
            },
            //success_url: success_url, // Replace with your success URL
            //cancel_url: cancel_url, // Replace with your cancel URL
          });
          console.log("Session:", session);
        } else {
          session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            customer: customer_id,
            ui_mode: "embedded",
            redirect_on_completion: "never",
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: "Payment for subscription",
                  },
                  unit_amount: amount, // Сума платежу у центах (20 доларів)
                },
                quantity: 1,
              },
            ],
            metadata: {
              type: "regular",
              order_id: orderId, // Include the order_id as metadata
            },
            invoice_creation: {
              enabled: true,
            },
            payment_intent_data: {
              setup_future_usage: "off_session",
            },
            mode: "payment",
          });
          console.log("Session:", session);
        }

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      } else {
        // If the new plan is a downgrade
        // Cancel the current subscription
        console.log("WITH CANCEL");
        const currentSubscription = await stripe.subscriptions.list({
          customer: customer_id,
          limit: 1,
        });

        if (currentSubscription.data.length > 0) {
          // Cancel the current subscription
          await stripe.subscriptions.cancel(currentSubscription.data[0].id);
        }

        // Create a new Checkout Session for the new plan
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "Payment for subscription",
                },
                unit_amount: "20", // Сума платежу у центах (20 доларів)
              },
              quantity: 1,
            },
          ],
          metadata: {
            order_id: orderId, // Include the order_id as metadata
          },
          mode: "payment",
        });
        console.log("Session:", session);

        // Update the order status in your database
        await db("metaenga_order_fondy")
          .update({
            statusUpdate: status,
          })
          .where({ order_id: orderId });

        return res.status(200).json({ client_secret: session.client_secret });
      }
    } catch (error) {
      console.error("Subscription order error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async subscriptionPay(req, res) {
    const { cardNumber, expiryDate, cvv } = req.body;
    const fondyClient = new CloudIpsp({
      merchantId: 1514244,
      secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
    });
    try {
      // Create a token or perform a secure operation with the card details using Fondy's library
      const paymentToken = await fondyClient.createToken(
        cardNumber,
        expiryDate,
        cvv
      );

      // Now use the token to create a subscription payment
      const subscriptionResponse = await fondyClient.createSubscription(
        paymentToken
      );

      res.json(subscriptionResponse);
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  }
  async fondyCallback(req, res) {
    try {
      const callbackData = req.body;
      const type = "monthly";
      const typePayment = "order";
      console.log("Received callback data:", callbackData);
      let planArray = ["Free", "Standart"];
      const fondy = new CloudIpsp({
        merchantId: 1514244,
        secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
      });
      const getOrderData = await db("metaenga_order_fondy")
        .first("*")
        .where({ order_id: callbackData.order_id });
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");
      try {
        await db("metaenga_licenses_logs").insert({
          company_id: getOrderData.order_company,
          count_licenses: getOrderData.licenseCount,
          date: date,
          status: 1,
        });
      } catch (error) {
        console.log(error);
      }

      if (getOrderData.newPlan == "Premium") return;
      if (callbackData.order_status == "declined") {
        return res.status(400).json({ message: callbackData.order_status });
      }
      if (callbackData.order_status == "expired") {
        return res.status(400).json({ message: callbackData.order_status });
      }
      if (callbackData.order_status == "reversed") {
        return res.status(400).json({ message: callbackData.order_status });
      }
      let getOldPlan = await db("company")
        .first("plan")
        .where({ id: getOrderData.order_company });
      const checkPaymnet = await db("metaenga_payment_fondy")
        .first("*")
        .where({ payment_id: callbackData.payment_id });
      if (checkPaymnet) {
        console.log("already exist");
        console.log(callbackData.order_status);
        console.log(callbackData.payment_id);
        console.log("Received callback data:", callbackData);
        return;
      }

      if (callbackData.order_status == "approved") {
        await db("metaenga_payment_fondy").insert({
          payment_id: callbackData.payment_id,
          order_id: callbackData.order_id,
          payment_status: callbackData.order_status,
          payment_date: new Date(),
          payment_type: "parent payment",
          payment_amount: callbackData.amount,
        });
        let check;
        const checkCancel = await db("metaenga_order_fondy").first("*").where({
          order_company: getOrderData.order_company,
          order_status: "success",
        });

        if (!checkCancel) {
          check = await db("metaenga_order_fondy")
            .where({ order_company: getOrderData.order_company }) // Replace 'your_company_value' with the desired company value
            .orderBy("order_id", "desc") // Order by task_id in descending order to get the latest record
            .first(); // Get the first (latest) record
          console.log("CHECK 1 ", check);
        } else {
          check = await db("metaenga_order_fondy").first("*").where({
            order_company: getOrderData.order_company,
            order_status: "success",
          });
          console.log("CHECK 2 ", check);
        }

        await db("metaenga_order_fondy")
          .update({ order_status: "stop" })
          .where({
            order_company: getOrderData.order_company,
            order_status: "success",
          });
        await db("metaenga_order_fondy")
          .update({
            order_status: "success",
            order_card: callbackData.masked_card,
            order_payment_system: callbackData.card_type,
          })
          .where({ order_id: callbackData.order_id });
        console.log("PREVIOUS ORDER ID", check.order_id);
        const requestBody = {
          company: getOrderData.order_company,
          newPlan: getOrderData.newPlan,
        };

        // const result = await db('userlink')
        //   .count('user as oldLicenses')
        //   .where({company: getOrderData.order_company});
        const cmp = await db("company")
          .first("*")
          .where({ id: getOrderData.order_company });
        const oldLicenses = cmp.payedLicense;

        //const oldLicenses = parseInt(result[0].oldLicenses, 10);

        const licenseCount = parseInt(getOrderData.licenseCount, 10);
        console.log("AAAAAAAAAAAAAAAAAA");
        console.log(oldLicenses);
        console.log("Правильное значение:");
        console.log(licenseCount);

        let newPlan = getOrderData.newPlan;
        let oldPlan = getOldPlan.plan;
        let newPlanIndex = planArray.indexOf(newPlan);
        let oldPlanIndex = planArray.indexOf(oldPlan);
        if (newPlanIndex > oldPlanIndex) {
          if (licenseCount < 3) {
            //10
            await db("company")
              .update({
                payedLicense: licenseCount,
                billing_type: "Monthly",
              })
              .where({ id: getOrderData.order_company });
            const companyId = await db("company")
              .first("*")
              .where({ id: getOrderData.order_company });
            const creatorMail = companyId.userEmail;
            let userDB = getOrderData.order_company;
            await db("metaenga_users")
              .update({
                status: "DEACTIVATED",
              })
              .whereNot({ email: creatorMail })
              .where({ company_id: getOrderData.order_company });

            await db("metaenga_plan_insight")
              .update({
                companyUsersLimit: 1,
              })
              .where({ companyId: getOrderData.order_company });

            await db("metaenga_payment_fondy")
              .update({
                payment_desc: "Subscription standard purchase",
              })
              .where({ payment_id: callbackData.payment_id });
            //всюди над updatePlan викликати функцію лист від лупс
            await sendReceipt(callbackData, type, typePayment).catch(
              (error) => {
                console.log("Помилка у функції sendReceipt:", error);
              }
            );

            const response = await updatePlan(requestBody).catch((error) => {
              console.log(error);
            });
            await db("metaenga_cron")
              .where({ company: getOrderData.order_company })
              .del();
            return res.status(200);
          }
          if (licenseCount >= 3) {
            //11
            await db("company")
              .update({
                payedLicense: licenseCount,
                billing_type: "Monthly",
              })
              .where({ id: getOrderData.order_company });
            await sendReceipt(callbackData, type, typePayment).catch(
              (error) => {
                console.log("Помилка у функції sendReceipt:", error);
              }
            );

            const response = await updatePlan(requestBody).catch((error) => {
              console.log(error);
            });
            await db("metaenga_payment_fondy")
              .update({
                payment_desc: "Subscription standard purchase",
              })
              .where({ payment_id: callbackData.payment_id });
            await db("metaenga_cron")
              .where({ company: getOrderData.order_company })
              .del();
            return res.status(200);
          }
        }

        if (newPlanIndex == oldPlanIndex) {
          if (oldLicenses <= licenseCount) {
            //4 + cancel subscription
            console.log("AAAAAAAAAAAAAAAAAA INCREASE LICENSES");
            if (checkCancel) {
              let previousOrderId = check.order_id;
              console.log("AAAAAAAAAAAAAAAAAA PREVIOUS ORDER", previousOrderId);
              const StopData = {
                order_id: previousOrderId,
                action: "stop",
              };
              console.log("AAAAAAAA");
              console.log(previousOrderId);
              await db("metaenga_payment_fondy")
                .where({ order_id: previousOrderId })
                .update({ payment_status: "stop" });
              console.log("CANCEL SUBSCRIPTION");
              console.log(StopData);

              fondy
                .SubscriptionActions(StopData)
                .then((data) => {
                  console.log(data);
                  return res.status(200).json({ data: data });
                })
                .catch((error) => {
                  console.log(error);
                });
            }
            await db("company")
              .update({
                payedLicense: licenseCount,
                billing_type: "Monthly",
              })
              .where({ id: getOrderData.order_company });
            await db("metaenga_payment_fondy")
              .update({
                payment_desc: "Update Standard plan, additional licenses",
              })
              .where({ payment_id: callbackData.payment_id });

            if (callbackData.amount != 1) {
              await sendReceipt(callbackData, type, typePayment).catch(
                (error) => {
                  console.log("Помилка у функції sendReceipt:", error);
                }
              );
            }

            const response = await updatePlan(requestBody).catch((error) => {
              console.log(error);
            });
            await db("metaenga_cron")
              .where({ company: getOrderData.order_company })
              .del();
            console.log("AAAAAAAAAAAAAAAAAA STATUS", getOrderData.statusUpdate);
            if (
              getOrderData.statusUpdate == "renew" ||
              getOrderData.statusUpdate == "decrease" ||
              getOrderData.statusUpdate == "changeCard"
            ) {
              console.log("AAAAAAAAAAAAAAAAAA", getOrderData.statusUpdate);
              console.log(
                "AAAAAAAAAAAAAAAAAA CURRENT ORDER",
                getOrderData.order_id
              );
              const reverseData = {
                currency: getOrderData.currency,
                amount: getOrderData.amount,
                order_id: getOrderData.order_id,
              };
              console.log(reverseData);
              fondy.Reverse(reverseData).then((data) => {
                console.log(data);
              });
            }
            return res.status(200);
          }
          if (oldLicenses > licenseCount) {
            //5 переработанный вариант, работает после удаленных пользователей
            console.log("AAAAAAAAAAAAAAAAAA DECREASE LICENSES");
            if (checkCancel) {
              let previousOrderId = check.order_id;

              const StopData = {
                order_id: previousOrderId,
                action: "stop",
              };
              console.log("AAAAAAAA");
              console.log(previousOrderId);
              await db("metaenga_payment_fondy")
                .where({ order_id: previousOrderId })
                .update({ payment_status: "stop" });
              console.log("CANCEL SUBSCRIPTION");
              console.log(StopData);

              fondy
                .SubscriptionActions(StopData)
                .then((data) => {
                  console.log(data);
                  return res.status(200).json({ data: data });
                })
                .catch((error) => {
                  console.log(error);
                });
            }
            await db("company")
              .update({
                payedLicense: licenseCount,
                billing_type: "Monthly",
              })
              .where({ id: getOrderData.order_company });
            await db("metaenga_payment_fondy")
              .update({
                payment_desc: "Update Standard plan, additional licenses",
              })
              .where({ payment_id: callbackData.payment_id });
            const response = await updatePlan(requestBody).catch((error) => {
              console.log(error);
            });
            await db("metaenga_cron")
              .where({ company: getOrderData.order_company })
              .del();

            if (
              getOrderData.statusUpdate == "renew" ||
              getOrderData.statusUpdate == "decrease" ||
              getOrderData.statusUpdate == "changeCard"
            ) {
              console.log("AAAAAAAAAAAAAAAAAA", getOrderData.statusUpdate);
              console.log(
                "AAAAAAAAAAAAAAAAAA CURRENT ORDER",
                getOrderData.order_id
              );
              const reverseData = {
                currency: getOrderData.currency,
                amount: getOrderData.amount,
                order_id: getOrderData.order_id,
              };
              console.log(reverseData);
              fondy.Reverse(reverseData).then((data) => {
                console.log(data);
              });
            }
            return res.status(200);
          }
        }

        // if(oldLicenses <= licenseCount){
        //   await db('company').update({
        //     payedLicense: licenseCount
        //   }).where({id: getOrderData.order_company})
        // }
        // if(oldLicenses > licenseCount){
        //   await db('company').update({
        //     payedLicense: licenseCount
        //   }).where({id: getOrderData.order_company})
        //   const companyId = await db('company').first('*').where({id: getOrderData.order_company})
        //   const creatorMail = companyId.userEmail
        //   let userDB = getOrderData.order_company
        //   await db(userDB).update({
        //     status: "DEACTIVATED"
        //   }).whereNot({email: creatorMail})
        // }
      }
    } catch (error) {
      console.error("Payment error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async fondyCallbackYear(req, res) {
    try {
      const callbackData = req.body;
      const type = "annually";
      const typePayment = "order";
      console.log("Received callback data:", callbackData);
      let planArray = ["Free", "Standart"];
      const fondy = new CloudIpsp({
        merchantId: 1514244,
        secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
      });
      const getOrderData = await db("metaenga_order_fondy")
        .first("*")
        .where({ order_id: callbackData.order_id });
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");
      try {
        await db("metaenga_licenses_logs").insert({
          company_id: getOrderData.order_company,
          count_licenses: getOrderData.licenseCount,
          date: date,
          status: 1,
        });
      } catch (error) {
        console.log(error);
      }

      if (getOrderData.newPlan == "Premium") return;
      if (callbackData.order_status == "declined") {
        return res.status(400).json({ message: callbackData.order_status });
      }
      if (callbackData.order_status == "expired") {
        return res.status(400).json({ message: callbackData.order_status });
      }
      if (callbackData.order_status == "reversed") {
        return res.status(400).json({ message: callbackData.order_status });
      }
      let getOldPlan = await db("company")
        .first("plan")
        .where({ id: getOrderData.order_company });
      const checkPaymnet = await db("metaenga_payment_fondy")
        .first("*")
        .where({ payment_id: callbackData.payment_id });
      if (checkPaymnet) {
        console.log("already exist");
        console.log(callbackData.order_status);
        console.log(callbackData.payment_id);
        console.log("Received callback data:", callbackData);
        return;
      }

      if (callbackData.order_status == "approved") {
        await db("metaenga_payment_fondy").insert({
          payment_id: callbackData.payment_id,
          order_id: callbackData.order_id,
          payment_status: callbackData.order_status,
          payment_date: new Date(),
          payment_type: "parent payment",
          payment_amount: callbackData.amount,
        });
        let check;
        const checkCancel = await db("metaenga_order_fondy").first("*").where({
          order_company: getOrderData.order_company,
          order_status: "success",
        });

        if (!checkCancel) {
          check = await db("metaenga_order_fondy")
            .where({ order_company: getOrderData.order_company }) // Replace 'your_company_value' with the desired company value
            .orderBy("order_id", "desc") // Order by task_id in descending order to get the latest record
            .first(); // Get the first (latest) record
          console.log("CHECK 1 ", check);
        } else {
          check = await db("metaenga_order_fondy").first("*").where({
            order_company: getOrderData.order_company,
            order_status: "success",
          });
          console.log("CHECK 2 ", check);
        }

        await db("metaenga_order_fondy")
          .update({ order_status: "stop" })
          .where({
            order_company: getOrderData.order_company,
            order_status: "success",
          });
        await db("metaenga_order_fondy")
          .update({
            order_status: "success",
            order_card: callbackData.masked_card,
            order_payment_system: callbackData.card_type,
          })
          .where({ order_id: callbackData.order_id });
        console.log("PREVIOUS ORDER ID", check.order_id);
        const requestBody = {
          company: getOrderData.order_company,
          newPlan: getOrderData.newPlan,
        };

        // const result = await db('userlink')
        //   .count('user as oldLicenses')
        //   .where({company: getOrderData.order_company});
        const cmp = await db("company")
          .first("*")
          .where({ id: getOrderData.order_company });
        const oldLicenses = cmp.payedLicense;

        //const oldLicenses = parseInt(result[0].oldLicenses, 10);

        const licenseCount = parseInt(getOrderData.licenseCount, 10);
        console.log("AAAAAAAAAAAAAAAAAA");
        console.log(oldLicenses);
        console.log("Правильное значение:");
        console.log(licenseCount);

        let newPlan = getOrderData.newPlan;
        let oldPlan = getOldPlan.plan;
        let newPlanIndex = planArray.indexOf(newPlan);
        let oldPlanIndex = planArray.indexOf(oldPlan);
        if (newPlanIndex > oldPlanIndex) {
          if (licenseCount < 3) {
            //10
            await db("company")
              .update({
                payedLicense: licenseCount,
                billing_type: "Yearly",
              })
              .where({ id: getOrderData.order_company });
            const companyId = await db("company")
              .first("*")
              .where({ id: getOrderData.order_company });
            const creatorMail = companyId.userEmail;
            let userDB = getOrderData.order_company;
            await db("metaenga_users")
              .update({
                status: "DEACTIVATED",
              })
              .whereNot({ email: creatorMail })
              .where({ company_id: getOrderData.order_company });

            await db("metaenga_plan_insight")
              .update({
                companyUsersLimit: 1,
              })
              .where({ companyId: getOrderData.order_company });

            await db("metaenga_payment_fondy")
              .update({
                payment_desc: "Subscription standard purchase",
              })
              .where({ payment_id: callbackData.payment_id });

            await sendReceipt(callbackData, type, typePayment).catch(
              (error) => {
                console.log("Помилка у функції sendReceipt:", error);
              }
            );

            const response = await updatePlan(requestBody).catch((error) => {
              console.log(error);
            });
            await db("metaenga_cron")
              .where({ company: getOrderData.order_company })
              .del();
            return res.status(200);
          }
          if (licenseCount >= 3) {
            //11
            await db("company")
              .update({
                payedLicense: licenseCount,
                billing_type: "Yearly",
              })
              .where({ id: getOrderData.order_company });

            await sendReceipt(callbackData, type, typePayment).catch(
              (error) => {
                console.log("Помилка у функції sendReceipt:", error);
              }
            );

            const response = await updatePlan(requestBody).catch((error) => {
              console.log(error);
            });
            await db("metaenga_payment_fondy")
              .update({
                payment_desc: "Subscription standard purchase",
              })
              .where({ payment_id: callbackData.payment_id });
            await db("metaenga_cron")
              .where({ company: getOrderData.order_company })
              .del();
            return res.status(200);
          }
        }

        if (newPlanIndex == oldPlanIndex) {
          if (oldLicenses <= licenseCount) {
            //4 + cancel subscription
            console.log("AAAAAAAAAAAAAAAAAA INCREASE LICENSES");
            if (checkCancel) {
              let previousOrderId = check.order_id;
              console.log("AAAAAAAAAAAAAAAAAA PREVIOUS ORDER", previousOrderId);
              const StopData = {
                order_id: previousOrderId,
                action: "stop",
              };
              console.log("AAAAAAAA");
              console.log(previousOrderId);
              await db("metaenga_payment_fondy")
                .where({ order_id: previousOrderId })
                .update({ payment_status: "stop" });
              console.log("CANCEL SUBSCRIPTION");
              console.log(StopData);

              fondy
                .SubscriptionActions(StopData)
                .then((data) => {
                  console.log(data);
                  return res.status(200).json({ data: data });
                })
                .catch((error) => {
                  console.log(error);
                });
            }
            await db("company")
              .update({
                payedLicense: licenseCount,
                billing_type: "Yearly",
              })
              .where({ id: getOrderData.order_company });
            await db("metaenga_payment_fondy")
              .update({
                payment_desc: "Update Standard plan, additional licenses",
              })
              .where({ payment_id: callbackData.payment_id });

            if (callbackData.amount != 1) {
              await sendReceipt(callbackData, type, typePayment).catch(
                (error) => {
                  console.log("Помилка у функції sendReceipt:", error);
                }
              );
            }

            const response = await updatePlan(requestBody).catch((error) => {
              console.log(error);
            });
            await db("metaenga_cron")
              .where({ company: getOrderData.order_company })
              .del();
            console.log("AAAAAAAAAAAAAAAAAA STATUS", getOrderData.statusUpdate);
            if (
              getOrderData.statusUpdate == "renew" ||
              getOrderData.statusUpdate == "decrease" ||
              getOrderData.statusUpdate == "changeCard"
            ) {
              console.log("AAAAAAAAAAAAAAAAAA", getOrderData.statusUpdate);
              console.log(
                "AAAAAAAAAAAAAAAAAA CURRENT ORDER",
                getOrderData.order_id
              );
              const reverseData = {
                currency: getOrderData.currency,
                amount: getOrderData.amount,
                order_id: getOrderData.order_id,
              };
              console.log(reverseData);
              fondy.Reverse(reverseData).then((data) => {
                console.log(data);
              });
            }
            return res.status(200);
          }
          if (oldLicenses > licenseCount) {
            //5 переработанный вариант, работает после удаленных пользователей
            console.log("AAAAAAAAAAAAAAAAAA DECREASE LICENSES");
            if (checkCancel) {
              let previousOrderId = check.order_id;

              const StopData = {
                order_id: previousOrderId,
                action: "stop",
              };
              console.log("AAAAAAAA");
              console.log(previousOrderId);
              await db("metaenga_payment_fondy")
                .where({ order_id: previousOrderId })
                .update({ payment_status: "stop" });
              console.log("CANCEL SUBSCRIPTION");
              console.log(StopData);

              fondy
                .SubscriptionActions(StopData)
                .then((data) => {
                  console.log(data);
                  return res.status(200).json({ data: data });
                })
                .catch((error) => {
                  console.log(error);
                });
            }
            await db("company")
              .update({
                payedLicense: licenseCount,
                billing_type: "Yearly",
              })
              .where({ id: getOrderData.order_company });
            await db("metaenga_payment_fondy")
              .update({
                payment_desc: "Update Standard plan, additional licenses",
              })
              .where({ payment_id: callbackData.payment_id });
            const response = await updatePlan(requestBody).catch((error) => {
              console.log(error);
            });
            await db("metaenga_cron")
              .where({ company: getOrderData.order_company })
              .del();

            if (
              getOrderData.statusUpdate == "renew" ||
              getOrderData.statusUpdate == "decrease" ||
              getOrderData.statusUpdate == "changeCard"
            ) {
              console.log("AAAAAAAAAAAAAAAAAA", getOrderData.statusUpdate);
              console.log(
                "AAAAAAAAAAAAAAAAAA CURRENT ORDER",
                getOrderData.order_id
              );
              const reverseData = {
                currency: getOrderData.currency,
                amount: getOrderData.amount,
                order_id: getOrderData.order_id,
              };
              console.log(reverseData);
              fondy.Reverse(reverseData).then((data) => {
                console.log(data);
              });
            }
            return res.status(200);
          }
        }

        // if(oldLicenses <= licenseCount){
        //   await db('company').update({
        //     payedLicense: licenseCount
        //   }).where({id: getOrderData.order_company})
        // }
        // if(oldLicenses > licenseCount){
        //   await db('company').update({
        //     payedLicense: licenseCount
        //   }).where({id: getOrderData.order_company})
        //   const companyId = await db('company').first('*').where({id: getOrderData.order_company})
        //   const creatorMail = companyId.userEmail
        //   let userDB = getOrderData.order_company
        //   await db(userDB).update({
        //     status: "DEACTIVATED"
        //   }).whereNot({email: creatorMail})
        // }
      }
    } catch (error) {
      console.error("Payment error:", error);
      return res.status(400).json({ message: "error" });
    }
  }

  async subscriptionCancel(req, res) {
    try {
      const userId = req.params.userId;

      const getCompanyId = await db("userlink")
        .first("*")
        .where({ user: userId });
      let companyId = getCompanyId.company;
      let licenseCount = 0;
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");

      const orderId = await db("metaenga_order_fondy")
        .first("*")
        .where({ order_company: companyId, order_status: "success" });

      try {
        await db("metaenga_licenses_logs").insert({
          company_id: companyId,
          status: 0,
          date: date,
          count_licenses: orderId.licenseCount,
        });
      } catch (error) {
        console.log(error);
      }
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", orderId);

      const fondy = new CloudIpsp({
        merchantId: 1514244,
        secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
      });
      const ok = orderId.order_id;
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", ok);
      const StopData = {
        order_id: ok,
        action: "stop",
      };
      console.log("CANCEL SUBSCRIPTION DATA", StopData);

      await db("metaenga_payment_fondy")
        .where({ order_id: orderId.order_id })
        .update({ payment_status: "stop" });
      await db("metaenga_order_fondy")
        .where({ order_id: orderId.order_id })
        .update({ order_status: "stop" });

      fondy
        .SubscriptionActions(StopData)
        .then((data) => {
          console.log(data);
          // return res.status(200).json({data: data})
        })
        .catch((error) => {
          console.log(error);
        });
      let actualDate;
      let getLastPaymentTime = await db("metaenga_subscription_fondy")
        .where({ order_id: ok })
        .orderBy("payment_date", "desc")
        .first("*");
      if (!getLastPaymentTime) {
        let getLastPaymentTimePayment = await db("metaenga_payment_fondy")
          .where({ order_id: ok })
          .orderBy("payment_date", "desc")
          .first("*");
        actualDate = getLastPaymentTimePayment.payment_date;
      } else {
        actualDate = getLastPaymentTime.payment_date;
      }
      console.log(getLastPaymentTime);
      let paymentDate = new Date(actualDate);
      paymentDate.setMonth(paymentDate.getMonth() + 1);
      let currentDate = new Date();
      let timeDifferenceInMs = paymentDate - currentDate;
      console.log(timeDifferenceInMs);
      console.log(
        `Time difference in days: ${
          timeDifferenceInMs / (1000 * 60 * 60 * 24)
        }}`
      );
      res.status(200);
      //  await db('company').update({
      //    payedLicense: licenseCount
      //  }).where({id: companyId})
      let TESTPayment = new Date();
      TESTPayment.setDate(TESTPayment.getDate() + 1); // Add one day to the current date

      await db("metaenga_cron").insert({
        plan: "Free",
        company: companyId,
        task_date: paymentDate, //paymentDate TESTPayment
        order_id: ok,
        task_desc: "cancel subscription",
        licenseCount: licenseCount,
      });
      await db("metaenga_cancel_fondy").insert({
        status: "cancel",
        company_id: companyId,
      });

      return res.status(200).json({
        message: "success",
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(400).json({ message: "error" });
    }
  }

  async subscriptionCancelYear(req, res) {
    try {
      const userId = req.params.userId;

      const getCompanyId = await db("userlink")
        .first("*")
        .where({ user: userId });
      let companyId = getCompanyId.company;
      let licenseCount = 0;
      const date = new Date().toISOString().slice(0, 19).replace("T", " ");

      const orderId = await db("metaenga_order_fondy")
        .first("*")
        .where({ order_company: companyId, order_status: "success" });

      try {
        await db("metaenga_licenses_logs").insert({
          company_id: companyId,
          status: 0,
          date: date,
          count_licenses: orderId.licenseCount,
        });
      } catch (error) {
        console.log(error);
      }
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", orderId);

      const fondy = new CloudIpsp({
        merchantId: 1514244,
        secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
      });
      const ok = orderId.order_id;
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", ok);
      const StopData = {
        order_id: ok,
        action: "stop",
      };
      console.log("CANCEL SUBSCRIPTION DATA", StopData);

      await db("metaenga_payment_fondy")
        .where({ order_id: orderId.order_id })
        .update({ payment_status: "stop" });
      await db("metaenga_order_fondy")
        .where({ order_id: orderId.order_id })
        .update({ order_status: "stop" });

      fondy
        .SubscriptionActions(StopData)
        .then((data) => {
          console.log(data);
          // return res.status(200).json({data: data})
        })
        .catch((error) => {
          console.log(error);
        });
      let actualDate;
      let getLastPaymentTime = await db("metaenga_subscription_fondy")
        .where({ order_id: ok })
        .orderBy("payment_date", "desc")
        .first("*");
      if (!getLastPaymentTime) {
        let getLastPaymentTimePayment = await db("metaenga_payment_fondy")
          .where({ order_id: ok })
          .orderBy("payment_date", "desc")
          .first("*");
        actualDate = getLastPaymentTimePayment.payment_date;
      } else {
        actualDate = getLastPaymentTime.payment_date;
      }
      console.log(getLastPaymentTime);
      let paymentDate = new Date(actualDate);
      paymentDate.setFullYear(paymentDate.getFullYear() + 1);
      let currentDate = new Date();
      let timeDifferenceInMs = paymentDate - currentDate;
      console.log(timeDifferenceInMs);
      console.log(
        `Time difference in days: ${
          timeDifferenceInMs / (1000 * 60 * 60 * 24)
        }}`
      );
      res.status(200);
      //  await db('company').update({
      //    payedLicense: licenseCount
      //  }).where({id: companyId})
      let TESTPayment = new Date();
      TESTPayment.setDate(TESTPayment.getDate() + 1); // Add one day to the current date

      await db("metaenga_cron").insert({
        plan: "Free",
        company: companyId,
        task_date: paymentDate, //paymentDate TESTPayment
        order_id: ok,
        task_desc: "cancel subscription",
        licenseCount: licenseCount,
      });
      await db("metaenga_cancel_fondy").insert({
        status: "cancel",
        company_id: companyId,
      });

      return res.status(200).json({
        message: "success",
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async subscriptionReverse(req, res) {
    try {
      const { order_id } = req.body;
      const orderData = await db("metaenga_order_fondy")
        .first("amount", "currency")
        .where({ order_id: order_id });
      const fondy = new CloudIpsp({
        merchantId: 1514244,
        secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
      });
      const reverseData = {
        currency: orderData.currency,
        amount: orderData.amount,
        order_id: order_id,
      };
      console.log(reverseData);
      fondy.Reverse(reverseData).then((data) => {
        console.log(data);
      });
      return res.status(200).json({ data: reverseData });
    } catch (error) {
      console.error("Error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async fondyCallbackSubscription(req, res) {
    try {
      const callbackData = req.body;
      const type = "monthly";
      const typePayment = "subscription";
      let currentDate = new Date();
      console.log("Received SUBCRIPTION CALLBACK DATA:", callbackData);
      const check = await db("metaenga_subscription_fondy")
        .first("*")
        .where({ payment_id: callbackData.payment_id });
      if (check) {
        console.log("already exist");
        console.log(callbackData.order_status);
        console.log(callbackData.payment_id);
        console.log("Received callback data:", callbackData);
        return res.status(200);
      }
      console.log("AAAAAAAAAAAAAAAAAA", callbackData.parent_order_id);
      let order_id = parseInt(callbackData.parent_order_id, 10);
      if (callbackData.order_status == "approved") {
        //make id int

        console.log("AAAAAAAAAAAAAAAAAA", order_id);
        await db("metaenga_subscription_fondy").insert({
          order_id: order_id,
          payment_status: callbackData.order_status,
          payment_date: currentDate,
          payment_type: "subscription payment",
          payment_id: callbackData.payment_id,
          payment_desc: "Monthly subscription, MetaEnga Standard plan",
          payment_amount: callbackData.amount,
        });
        return res.status(200);
      } else {
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", order_id);

        const fondy = new CloudIpsp({
          merchantId: 1514244,
          secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
        });

        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", order_id);
        const StopData = {
          order_id: order_id,
          action: "stop",
        };
        console.log("CANCEL SUBSCRIPTION DATA", StopData);
        await db("metaenga_payment_fondy")
          .where({ order_id: order_id })
          .update({ payment_status: "stop" });
        await db("metaenga_order_fondy")
          .where({ order_id: order_id })
          .update({ order_status: "stop" });

        fondy
          .SubscriptionActions(StopData)
          .then((data) => {
            console.log(data);
            // return res.status(200).json({data: data})
          })
          .catch((error) => {
            console.log(error);
          });
        const getCompany = await db("metaenga_order_fondy")
          .first("*")
          .where({ order_id: order_id });
        const requestBody = {
          company: getCompany.order_company,
          newPlan: "Free",
        };

        await sendReceipt(callbackData, type, typePayment).catch((error) => {
          console.log("Помилка у функції sendReceipt:", error);
        });

        const response = await updatePlan(requestBody).catch((error) => {
          console.log(error);
        });
        await db("metaenga_cancel_fondy").insert({
          status: "not paid",
          company_id: getCompany.order_company,
        });
        //make DEACTIVATED all users except creator
        const companyId = await db("company")
          .first("*")
          .where({ id: getCompany.order_company });
        const creatorMail = companyId.userEmail;
        let userDB = getCompany.order_company;
        await db("metaenga_users")
          .update({
            status: "DEACTIVATED",
          })
          .whereNot({ email: creatorMail })
          .where({ company_id: getCompany.order_company });
      }
      res.status(200);
    } catch (error) {
      console.log(error);
    }
  }
  async fondyCallbackSubscriptionYear(req, res) {
    try {
      const callbackData = req.body;
      const type = "annually";
      const typePayment = "subscription";
      let currentDate = new Date();
      console.log("Received SUBCRIPTION CALLBACK DATA:", callbackData);
      const check = await db("metaenga_subscription_fondy")
        .first("*")
        .where({ payment_id: callbackData.payment_id });
      if (check) {
        console.log("already exist");
        console.log(callbackData.order_status);
        console.log(callbackData.payment_id);
        console.log("Received callback data:", callbackData);
        return res.status(200);
      }
      console.log("AAAAAAAAAAAAAAAAAA", callbackData.parent_order_id);
      let order_id = parseInt(callbackData.parent_order_id, 10);
      if (callbackData.order_status == "approved") {
        //make id int

        console.log("AAAAAAAAAAAAAAAAAA", order_id);
        await db("metaenga_subscription_fondy").insert({
          order_id: order_id,
          payment_status: callbackData.order_status,
          payment_date: currentDate,
          payment_type: "subscription payment",
          payment_id: callbackData.payment_id,
          payment_desc: "Yearly subscription, MetaEnga Standard plan",
          payment_amount: callbackData.amount,
        });
        return res.status(200);
      } else {
        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", order_id);

        const fondy = new CloudIpsp({
          merchantId: 1514244,
          secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
        });

        console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", order_id);
        const StopData = {
          order_id: order_id,
          action: "stop",
        };
        console.log("CANCEL SUBSCRIPTION DATA", StopData);
        await db("metaenga_payment_fondy")
          .where({ order_id: order_id })
          .update({ payment_status: "stop" });
        await db("metaenga_order_fondy")
          .where({ order_id: order_id })
          .update({ order_status: "stop" });

        fondy
          .SubscriptionActions(StopData)
          .then((data) => {
            console.log(data);
            // return res.status(200).json({data: data})
          })
          .catch((error) => {
            console.log(error);
          });
        const getCompany = await db("metaenga_order_fondy")
          .first("*")
          .where({ order_id: order_id });
        const requestBody = {
          company: getCompany.order_company,
          newPlan: "Free",
        };

        await sendReceipt(callbackData, type, typePayment).catch((error) => {
          console.log("Помилка у функції sendReceipt:", error);
        });

        const response = await updatePlan(requestBody).catch((error) => {
          console.log(error);
        });
        await db("metaenga_cancel_fondy").insert({
          status: "not paid",
          company_id: getCompany.order_company,
        });
        //make DEACTIVATED all users except creator
        const companyId = await db("company")
          .first("*")
          .where({ id: getCompany.order_company });
        const creatorMail = companyId.userEmail;
        let userDB = getCompany.order_company;
        await db("metaenga_users")
          .update({
            status: "DEACTIVATED",
          })
          .whereNot({ email: creatorMail })
          .where({ company_id: getCompany.order_company });
      }
      res.status(200);
    } catch (error) {
      console.log(error);
    }
  }

  async getMonthlyPayment(req, res) {
    try {
      const payment = req.params.payment;
      const companyId = req.params.companyId;
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", payment);
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA", companyId);

      await db("company")
        .update({
          monthly_bill: payment,
        })
        .where({ id: companyId });

      return res.status(200).json({ message: "success" });
    } catch (error) {
      console.error("Error:", error);
      return res.status(400).json({ message: "error" });
    }
  }
  async getPaymentReceipt(req, res) {
    //get last receipt by company
    try {
      const companyId = req.params.companyId;
      const getOrderId = await db("metaenga_order_fondy")
        .select("*")
        .where({ order_company: companyId })
        .orderBy("order_id", "desc")
        .first();

      const getPayment = await db("metaenga_payment_fondy")
        .select("*")
        .where({ order_id: getOrderId.order_id })
        .orderBy("payment_date", "desc")
        .first(); // If you only want the latest payment

      return res.status(200).json(getPayment.order_url);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: "error" });
    }
  }
  async getPaymentHistory(req, res) {
    try {
      const companyId = req.params.companyId;
      const getOrderId = await db("metaenga_order_fondy")
        .select("*")
        .where({ order_company: companyId });

      const payments = [];

      await Promise.all(
        getOrderId.map(async (order) => {
          const getSubscriptionPayment = await db("metaenga_subscription_fondy")
            .select("*")
            .where({ order_id: order.order_id });

          getSubscriptionPayment.forEach((payment) => {
            payments.push(processPayment(payment));
          });

          const getPayment = await db("metaenga_payment_fondy")
            .select("*")
            .where({ order_id: order.order_id });

          getPayment.forEach((payment) => {
            payments.push(processPayment(payment));
          });
        })
      );

      // Create the result object with the payments array
      const result = {
        data: payments,
      };

      return res.status(200).json(result);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: "error" });
    }
  }
}

function processPayment(payment) {
  if (payment.order_url && payment.order_url.startsWith("./static/")) {
    payment.order_url = payment.order_url.slice("./static/".length);
  }

  if (payment.sub_url && payment.sub_url.startsWith("./static/")) {
    payment.sub_url = payment.sub_url.slice("./static/".length);
  }

  return payment;
}

function generateSignature(requestData, secretKey) {
  // Sort the parameters alphabetically
  const orderedKeys = Object.keys(requestData).sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  const signatureRaw = orderedKeys.map((v) => requestData[v]).join("|");
  const signature = crypto.createHash("sha1");
  console.log(signatureRaw);
  console.log(`${secretKey}|${signatureRaw}`);
  signature.update(`${secretKey}|${signatureRaw}`);
  console.log(signature);
  signature.digest("hex");
  console.log(signature);

  return signature;
}

function returnMoney(requestBody) {
  try {
    const fondy = new CloudIpsp({
      merchantId: 1514244,
      secretKey: "dJKjKa3HjkqGMalDpwcTIej8d0sdgAM0",
    });
    const reverseData = {
      currency: requestBody.currency,
      amount: requestBody.amount,
      order_id: requestBody.order_id,
    };
    console.log(reverseData);
    fondy.Reverse(reverseData).then((data) => {
      console.log(data);
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(400).json({ message: "error" });
  }
}
async function updatePlan(requestBody) {
  try {
    const response = await axios.post(
      `http://localhost:${process.env.PORT}/upgrade/plan`,
      requestBody
    );
    console.log("CALLING API TO UPDATE PLAN");
    console.log(requestBody)
    console.log(response);

    return response;
  } catch (error) {
    console.error("Error calling API:", error);
    throw error; // Re-throw the error to be caught in the parent function
  }
}
async function assignTraining(requestBody) {
  try {
    const response = await axios.post(
      `http://localhost:${process.env.PORT}/vr/exclusive/add/training`,
      requestBody
    );
    console.log("CALLING API TO UPDATE PLAN");
    console.log(response);

    return response;
  } catch (error) {
    console.error("Error calling API:", error);
    throw error; // Re-throw the error to be caught in the parent function
  }
}
async function assignTrainingFlex(requestBody) {
  try {
    const response = await axios.post(
      `http://localhost:${process.env.PORT}/vr/flex/add/training`,
      requestBody
    );
    console.log("CALLING API TO UPDATE PLAN");
    console.log(response);

    return response;
  } catch (error) {
    console.error("Error calling API:", error);
    throw error; // Re-throw the error to be caught in the parent function
  }
}

async function sendReceipt(callbackData, type, typePayment) {
  try {
    console.log("Received callback data:", callbackData);
    const getCompany = await db("company")
      .first("*")
      .where({ userEmail: callbackData.sender_email });

    await db("metaenga_payment_fondy")
      .update({
        progress: "25",
      })
      .where("order_id", callbackData.order_id);

    const imagePath = `/var/www/metaengaplatform/node-app/static/pdfReceipt/Logo_MetaEnga_full.png`; //root/metaenga/metaengaplatform/node-app/static/pdf/image1.png
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const html = `<!DOCTYPE html>
    <html lang="en">
    
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Document</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: "Inter, sans-serif";
          color: #2e3a4b;
          background: #ffffff;
          width: 650px;
          padding: 56px;
        }
    
        .row {
          display: flex;
          width: 100%;
          margin-bottom: 6px;
        }
    
        .row__header {
          flex-basis: 50%;
          flex-grow: 0;
          flex-shrink: 0;
          color: #69727d;
        }
    
        .divider {
          height: 1px;
          background: #c1c4c9;
          margin-bottom: 17px;
          width: 100%;
        }
      </style>
    </head>
    
    <body>
      <div style="
                display: flex;
                justify-content: space-between;
                width: 100%;
                margin-bottom: 40px;
              ">
        <div style="flex-basis: 148px; flex-shrink: 0; flex-grow: 0">
          <img
          src="data:image/png;base64,${base64Image}"
          alt="Metaenga logo"
          style="max-width: 100%; width: 100%"
         />
        </div>
        <div style="
                  flex-basis: 50%;
                  flex-shrink: 0;
                  flex-grow: 0;
                  font-size: 14px;
                  font-weight: 400;
                  color: #6d7681;
                  line-height: 138%;
                  letter-spacing: 0.48px;
                ">
          <p>
            Digital Engineering and Magic, <br />
            LLC d/b/a Metaenga <br />
            Trostyanetska str, 6G, Kyiv, 02091 <br />
            +38 (093) 379 69 71 <br />
            info@metaenga.com
          </p>
        </div>
      </div>
      <div style="margin-bottom: 27px">
        <p style="
                  font-size: 20px;
                  font-weight: 600;
                  letter-spacing: 0.7px;
                  margin-bottom: 4px;
                ">
          Receipt from Metaenga
        </p>
        <p style="
                  font-size: 14px;
                  font-weight: 400;
                  color: #6d7681;
                  line-height: 138%;
                  letter-spacing: 0.49px;
                ">
          Your transaction is completed and processed securely. <br />
          Please retain this copy for your records.
        </p>
      </div>
      <div style="font-size: 14px; letter-spacing: 0.49px">
        <p style="font-weight: 600; margin-bottom: 8px">Transaction</p>
        <div style="margin-bottom: 11px">
          <div class="row">
            <p class="row__header">
              Purpose
            </p>
            <p>Standard plan (${type})</p>
          </div>
          <div class="row">
            <p class="row__header">
              Total price
            </p>
            <p>${callbackData.amount / 100} USD</p>
          </div>
          <div class="row">
            <p class="row__header">
              Date
            </p>
            <p>${callbackData.order_time}</p>
          </div>
          <div class="row">
            <p class="row__header">
              Payment status
            </p>
            <p>${callbackData.order_status}</p>
          </div>
          <div class="row">
            <p class="row__header">
              Payment ID
            </p>
            <p>${callbackData.payment_id}</p>
          </div>
          <div class="row">
            <p class="row__header">
              Payment recipient
            </p>
            <p>app.metaenga.com</p>
          </div>
        </div>
        <div class="divider"></div>
        <p style="font-weight: 600; margin-bottom: 8px">Payment method</p>
        <section style="margin-bottom: 17px">
          <div class="row">
            <p class="row__header">
              Method
            </p>
            <p>Card</p>
          </div>
          <div class="row">
            <p class="row__header">
              Card type
            </p>
            <p>${callbackData.card_type}</p>
          </div>
          <div class="row">
            <p class="row__header">
              Card number
            </p>
            <p>${callbackData.masked_card}</p>
          </div>
        </section>
        <div class="divider"></div>
        <p style="font-weight: 600; margin-bottom: 8px">Customer</p>
        <div style="margin-bottom: 17px">
          <div class="row">
            <p class="row__header">
              Email
            </p>
            <p>${callbackData.sender_email}</p>
          </div>
        </div>
      </div>
    
    </body>
    
    </html>`;

    console.log("HTML");

    const pdfFilePath = `./static/pdfReceipt/receipt_metasub_${getCompany.companyName.replace(
      /\s+/g,
      "_"
    )}_${callbackData.order_time.replace(/[.  :]/g, "_")}_${
      callbackData.order_id
    }.pdf`;

    const pdfFilePathlOOPS =
      `/pdfReceipt/receipt_metasub_${getCompany.companyName.replace(
        /\s+/g,
        "_"
      )}_${callbackData.order_time.replace(/[.  :]/g, "_")}_${
        callbackData.order_id
      }.pdf`.replace(/`/g, "%60");

    await db("metaenga_payment_fondy")
      .update({
        progress: "50",
      })
      .where("order_id", callbackData.order_id);

    console.log("PDF FILE PATH");
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--max-old-space-size=4096", // Increase memory limit
      ],
    });
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0); // Disable timeout

    await page.setContent(html);
    console.log("HTML content set on page");
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

    const options = {
      path: pdfFilePath,
      format: "A4",
      printBackground: true,
    };

    await page.pdf(options);
    console.log("PDF generated successfully");

    await Promise.all([
      (async () => {
        if (typePayment === "order") {
          await db("metaenga_payment_fondy")
            .update({ progress: "100" })
            .where("order_id", callbackData.order_id);
          await db("metaenga_payment_fondy")
            .update({ order_url: pdfFilePath })
            .where("order_id", callbackData.order_id);
        } else {
          await db("metaenga_payment_fondy")
            .update({ progress: "100" })
            .where("order_id", callbackData.order_id);
          await db("metaenga_payment_fondy")
            .update({ sub_url: pdfFilePath })
            .where("order_id", callbackData.order_id);
        }
        browser.close();
      })(),
    ]);

    const checkEmail = await db("metaenga_users")
      .where("email", callbackData.sender_email)
      .first();
    if (!checkEmail) {
      return res.status(400).json({
        status: "error",
        data: "Email not found",
      });
    }

    // Додайте ключ API до заголовків
    const apiKey = "361400aa1b89d4a52e914cdc641ecec7"; // Замініть на ваш ключ API

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Date: new Date().toUTCString(),
    };

    const apiUrlForSendReceipt = "https://app.loops.so/api/v1/transactional";

    // Об'єкт даних для створення контакту
    const contactDataForSendReceipt = {
      transactionalId: "clsec83oc006efi6hr3i80guo",
      email: callbackData.sender_email,
      dataVariables: {
        firstName: checkEmail.name,
        totalPrice: callbackData.amount / 100,
        pdfFilePath: pdfFilePathlOOPS,
      },
    };

    const apiUrlFound = `https://app.loops.so/api/v1/contacts/find?email=${callbackData.sender_email}`;

    // Виконуємо GET-запит до API Loops за допомогою Axios
    const responseFound = await axios.get(apiUrlFound, { headers });

    if (responseFound.status === 200) {
      const data = responseFound.data;
      // Перевіряємо, чи отримали масив контактів
      if (Array.isArray(data)) {
        if (data.length > 0) {
          // Контакт із вказаною електронною адресою знайдено
          const apiUrl = "https://app.loops.so/api/v1/contacts/update";

          const updateData = {
            email: callbackData.sender_email,
            totalPrice: callbackData.amount / 100,
            pdfFilePath: pdfFilePathlOOPS,
          };

          const response = await axios
            .put(apiUrl, updateData, { headers })
            .then(async (response) => {
              // Відправка POST-запиту з використанням ключа API
              const responseForSendInvoice = await axios.post(
                apiUrlForSendReceipt,
                contactDataForSendReceipt,
                { headers }
              );
            });
        } else {
          const apiUrl = "https://app.loops.so/api/v1/contacts/create";

          // Об'єкт даних для створення контакту
          const contactData = {
            email: callbackData.sender_email,
            firstName: checkEmail.name,
            companyName: getCompany.companyName,
            companyId: getCompany.company_id,
            userGroup: checkEmail.role,
            source: "Old company",
            plan: getCompany.plan,
            totalPrice: callbackData.amount / 100,
            pdfFilePath: pdfFilePathlOOPS,
          };

          // Відправка POST-запиту з використанням ключа API
          axios
            .post(apiUrl, contactData, { headers })
            .then(async (response) => {
              // Відправка POST-запиту з використанням ключа API
              const responseForSendInvoice = await axios.post(
                apiUrlForSendReceipt,
                contactDataForSendReceipt,
                { headers }
              );
            });
        }
      }
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

module.exports = new Payment();
