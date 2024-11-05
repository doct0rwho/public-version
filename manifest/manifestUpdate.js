const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const db = require("../db");
//const bcrypt = require("bcrypt");
const fs = require("fs");
const axios = require("axios");
//let rimraf = require("rimraf");
//let uuid = require('uuid');
//let nodemailer = require('nodemailer');
const { exec } = require("child_process");
const con = require("../db");
const { get } = require("http");
//const emailValidator = require('deep-email-validator');
dotenv.config();
//const util = require('util');
//const con = require('../db');
const semaphore = require("semaphore")(1);
const stripe = require("stripe")(
  //"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" - sk_test_51Ov3qQACtPVEAgimCbug7p1v2BEqr7ZH4eqG5gr1eD3Jk8IKdHVZfDAozN3gf930SLZAOgrgggfol6WntDesgHjR00LF8ODjlo
  `${process.env.STRIPE_SECRET_KEY}`
);
class Manifest {
  async addTrainingToPlan(req, res) {
    try {
      semaphore.take(async function () {
        let trainingId = req.params.training;
        let plan = req.params.plan;
        if (plan == "free") {
          let check = await db("metaenga_free")
            .where({ id: trainingId })
            .first();
          if (check) {
            semaphore.leave();
            return res.status(400).json({
              status: "error",
              message: "Training already added to plan",
            });
          }
          let check2 = await db("trainings").where({ id: trainingId }).first();
          if (!check2) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          let companies = await db("company")
            .pluck("id")
            .where({ plan: "Free" });
          console.log(`COMPANIES: ${companies}`);
          let trainingCompanies = await db("metaenga_training_company")
            .whereIn("company", companies)
            .where("training", trainingId)
            .where("plan", "free")
            .pluck("company")
            .distinct();
          console.log(`TRAININGS: ${trainingCompanies}`);
          let remainingCompanies = companies.filter(
            (companyId) => !trainingCompanies.includes(companyId)
          );
          console.log("Remaining companies: ");
          console.log(remainingCompanies);
          const training = await db("trainings")
            .where({ id: trainingId })
            .first();
          const platfroms = training.platform;
          const pico = await platfroms.some((item) => item.platform === "pico");
          const quest = await platfroms.some(
            (item) => item.platform === "quest"
          );
          const windows = await platfroms.some(
            (item) => item.platform === "windows"
          );
          console.log("Platforms: ");
          console.log(platfroms);
          console.log("Pico: ");
          console.log(pico);
          console.log("Quest: ");
          console.log(quest);
          if (quest == true) {
            console.log("AAAAAAAAAAAAAA");
            console.log(
              "Number of trainingCompanies:",
              remainingCompanies.length
            );

            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "quest", // Add the selected platform to the request body
                  plan: "free",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }
          if (pico == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "free",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }
          if (windows == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "free",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }

          await db("metaenga_free").insert({ id: trainingId, time: time });
          semaphore.leave();
          return res.status(200).json({
            status: "success",
          });
        }
        if (plan == "standart") {
          let check = await db("metaenga_standart")
            .where({ id: trainingId })
            .first();
          if (check) {
            semaphore.leave();
            return res.status(400).json({
              status: "error",
              message: "Training already added to plan",
            });
          }
          let check2 = await db("trainings").where({ id: trainingId }).first();
          if (!check2) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          let companies = await db("company")
            .pluck("id")
            .where({ plan: "Standart" });
          let trainingCompanies = await db("metaenga_training_company")
            .whereIn("company", companies)
            .where("training", trainingId)
            .where("plan", "standart")
            .pluck("company")
            .distinct();
          let remainingCompanies = companies.filter(
            (companyId) => !trainingCompanies.includes(companyId)
          );
          const training = await db("trainings")
            .where({ id: trainingId })
            .first();
          const platfroms = training.platform;
          const pico = await platfroms.some((item) => item.platform === "pico");
          const quest = await platfroms.some(
            (item) => item.platform === "quest"
          );
          const windows = await platfroms.some(
            (item) => item.platform === "windows"
          );

          if (quest == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "quest", // Add the selected platform to the request body
                  plan: "standart",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }
          if (pico == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "standart",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }
          if (windows == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "standart",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }
          await db("metaenga_standart").insert({ id: trainingId, time: time });
          semaphore.leave();
          return res.status(200).json({
            status: "success",
          });
        }
        if (plan == "premium") {
          let check = await db("metaenga_premium")
            .where({ id: trainingId })
            .first();
          if (check) {
            semaphore.leave();
            return res.status(400).json({
              status: "error",
              message: "Training already added to plan",
            });
          }
          let check2 = await db("trainings").where({ id: trainingId }).first();
          if (!check2) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          let companies = await db("company")
            .pluck("id")
            .where({ plan: "Premium" });
          let trainingCompanies = await db("metaenga_training_company")
            .whereIn("company", companies)
            .where("training", trainingId)
            .where("plan", "premium")
            .pluck("company")
            .distinct();
          let remainingCompanies = companies.filter(
            (companyId) => !trainingCompanies.includes(companyId)
          );
          const training = await db("trainings")
            .where({ id: trainingId })
            .first();
          const platfroms = training.platform;
          const pico = await platfroms.some((item) => item.platform === "pico");
          const quest = await platfroms.some(
            (item) => item.platform === "quest"
          );
          const windows = await platfroms.some(
            (item) => item.platform === "windows"
          );

          if (quest == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "quest", // Add the selected platform to the request body
                  plan: "premium",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }
          if (pico == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "premium",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }
          if (windows == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "premium",
                };

                const response = await addTrainng(requestBody);
              }, 3000);
            }
          }
          await db("metaenga_premium").insert({ id: trainingId, time: time });
          semaphore.leave();
          return res.status(200).json({
            status: "success",
          });
        }
      });
      //
    } catch (err) {
      semaphore.leave();
      console.log(err);
    }
  }
  async removeTrainingToPlan(req, res) {
    try {
      semaphore.take(async function () {
        let trainingId = req.params.training;
        let plan = req.params.plan;
        if (plan == "free") {
          let check = await db("metaenga_free")
            .where({ id: trainingId })
            .first();
          if (!check) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          let check2 = await db("trainings").where({ id: trainingId }).first();
          if (!check2) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          let companies = await db("company")
            .pluck("id")
            .where({ plan: "Free" });
          console.log("companies: ");
          console.log(companies);
          let trainingCompanies = await db("metaenga_training_company")
            .whereIn("company", companies)
            .where("training", trainingId)
            .where("plan", "free")
            .pluck("company")
            .distinct();
          console.log("Training cmp: ");
          console.log(trainingCompanies);
          let remainingCompanies = companies.filter((companyId) =>
            trainingCompanies.includes(companyId)
          );
          console.log(remainingCompanies);
          // return res.status(200).json({
          //     status: 'success',
          //     result: remainingCompanies
          // })
          const training = await db("trainings")
            .where({ id: trainingId })
            .first();
          const platfroms = training.platform;
          const pico = await platfroms.some((item) => item.platform === "pico");
          const quest = await platfroms.some(
            (item) => item.platform === "quest"
          );
          const windows = await platfroms.some(
            (item) => item.platform === "windows"
          );
          console.log(platfroms);
          console.log(pico);
          console.log(quest);
          if (quest == true) {
            console.log("AAAAAAAAAAAAAA");
            console.log(
              "Number of trainingCompanies:",
              remainingCompanies.length
            );

            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "quest", // Add the selected platform to the request body
                  plan: "free",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }
          if (pico == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "free",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }
          if (windows == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              console.log("VVVVVVVVVVVVVV");
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "free",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }

          await db("metaenga_free").where({ id: trainingId }).del();
          semaphore.leave();
          return res.status(200).json({
            status: "success",
          });
        }
        if (plan == "standart") {
          let check = await db("metaenga_standart")
            .where({ id: trainingId })
            .first();
          if (!check) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          let check2 = await db("trainings").where({ id: trainingId }).first();
          if (!check2) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          let companies = await db("company")
            .pluck("id")
            .where({ plan: "Standart" });
          let trainingCompanies = await db("metaenga_training_company")
            .whereIn("company", companies)
            .where("training", trainingId)
            .where("plan", "standart")
            .pluck("company")
            .distinct();
          let remainingCompanies = companies.filter((companyId) =>
            trainingCompanies.includes(companyId)
          );
          const training = await db("trainings")
            .where({ id: trainingId })
            .first();
          const platfroms = training.platform;
          const pico = await platfroms.some((item) => item.platform === "pico");
          const quest = await platfroms.some(
            (item) => item.platform === "quest"
          );
          const windows = await platfroms.some(
            (item) => item.platform === "windows"
          );

          if (quest == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "quest", // Add the selected platform to the request body
                  plan: "standart",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }
          if (pico == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "standart",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }
          if (windows == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              const timeout1 = setTimeout(async () => {
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "standart",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }
          await db("metaenga_standart").where({ id: trainingId }).del();
          semaphore.leave();
          return res.status(200).json({
            status: "success",
          });
        }
        if (plan == "premium") {
          let check = await db("metaenga_premium")
            .where({ id: trainingId })
            .first();
          if (!check) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          let check2 = await db("trainings").where({ id: trainingId }).first();
          if (!check2) {
            semaphore.leave();
            return res
              .status(400)
              .json({ status: "error", message: "Training not found" });
          }
          const time = new Date()
            .toISOString()
            .replace(/T/, " ")
            .replace(/\..+/, "");
          let companies = await db("company")
            .pluck("id")
            .where({ plan: "Premium" });
          console.log(`COMPANIES:`);
          console.log(companies);
          let trainingCompanies = await db("metaenga_training_company")
            .whereIn("company", companies)
            .where("training", trainingId)
            .where("plan", "premium")
            .pluck("company")
            .distinct();
          console.log(`TRAININGS:`);
          console.log(trainingCompanies);
          let remainingCompanies = companies.filter((companyId) =>
            trainingCompanies.includes(companyId)
          );
          console.log(`PLATFORMS: ${remainingCompanies}`);
          const training = await db("trainings")
            .where({ id: trainingId })
            .first();
          const platfroms = training.platform;
          const pico = await platfroms.some((item) => item.platform === "pico");
          const quest = await platfroms.some(
            (item) => item.platform === "quest"
          );
          const windows = await platfroms.some(
            (item) => item.platform === "windows"
          );
          if (quest == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              const timeout1 = setTimeout(async () => {
                console.log("VVVVVVVVVVVVVV");
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "quest", // Add the selected platform to the request body
                  plan: "premium",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }
          if (pico == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              const timeout1 = setTimeout(async () => {
                console.log("VVVVVVVVVVVVVV");
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "premium",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }
          if (windows == true) {
            for (let i = 0; i < remainingCompanies.length; i++) {
              const timeout1 = setTimeout(async () => {
                console.log("VVVVVVVVVVVVVV");
                const requestBody = {
                  company: remainingCompanies[i],
                  id: trainingId,
                  publicly: 1, // Use the value of the publicity state
                  platform: "pico", // Add the selected platform to the request body
                  plan: "premium",
                };

                const response = await removeTrainng(requestBody);
              }, 3000);
            }
          }
          await db("metaenga_premium").where({ id: trainingId }).del();
          semaphore.leave();
          return res.status(200).json({
            status: "success",
          });
        }

        //
      });
    } catch (err) {
      console.log(err);
    }
  }
  async addTrainingExclusive(req, res) {
    semaphore.take(async function () {
      try {
        const { training, company } = req.body;
        const Platforms = await db("trainings")
          .first("platform")
          .where({ id: training });
        console.log(Platforms);
        let getPlatforms = Platforms.platform;

        if (!getPlatforms) {
          semaphore.leave();
          return res.status(404).json({ message: "Training not found" });
        }
        if (getPlatforms.some((item) => item.platform === "quest")) {
          const timeout1 = setTimeout(async () => {
            console.log("VVVVVVVVVVVVVV");
            const requestBody = {
              company: company,
              id: training,
              publicly: 1, // Use the value of the publicity state
              platform: "quest", // Add the selected platform to the request body
            };

            const response = await addTrainng(requestBody);
          }, 3000);
        }
        if (getPlatforms.some((item) => item.platform === "pico")) {
          const timeout1 = setTimeout(async () => {
            console.log("VVVVVVVVVVVVVV");
            const requestBody = {
              company: company,
              id: training,
              publicly: 1, // Use the value of the publicity state
              platform: "pico", // Add the selected platform to the request body
            };

            const response = await addTrainng(requestBody);
          }, 3000);
        }
        if (getPlatforms.some((item) => item.platform === "windows")) {
          const timeout1 = setTimeout(async () => {
            console.log("VVVVVVVVVVVVVV");
            const requestBody = {
              company: company,
              id: training,
              publicly: 1, // Use the value of the publicity state
              platform: "windows", // Add the selected platform to the request body
            };

            const response = await addTrainng(requestBody);
          }, 3000);
        }
        semaphore.leave();
        return res.status(200).json({
          status: "success",
        });
      } catch (err) {
        semaphore.leave();
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
      }
    });
  }
  async removeTrainingExclusive(req, res) {
    const { training, company } = req.body;
    const check = await db("trainings").where({ id: training }).first();
    if (!check) return res.status(404).json({ message: "Training not found" });
    await db("metaenga_training_company")
      .where({ training: training, company: company, plan: "exclusive" })
      .del();
    return res.status(200).json({
      status: "success",
      message: "Training removed",
    });
  }
  async addTrainingFlex(req, res) {
    semaphore.take(async function () {
      try {
        console.log("SECOND STEP");
        const { training, company, headsets } = req.body;
        const Platforms = await db("trainings")
          .first("platform")
          .where({ id: training });
        console.log(Platforms);
        let getPlatforms = Platforms.platform;

        if (!getPlatforms) {
          semaphore.leave();
          return res.status(404).json({ message: "Training not found" });
        }
        if (getPlatforms.some((item) => item.platform === "quest")) {
          const timeout1 = setTimeout(async () => {
            console.log("VVVVVVVVVVVVVV");
            const requestBody = {
              company: company,
              id: training,
              publicly: 1, // Use the value of the publicity state
              platform: "quest", // Add the selected platform to the request body
              plan: "flex",
              quantity: headsets,
            };

            const response = await addTrainng(requestBody);
          }, 3000);
        }
        if (getPlatforms.some((item) => item.platform === "pico")) {
          const timeout1 = setTimeout(async () => {
            console.log("VVVVVVVVVVVVVV");
            const requestBody = {
              company: company,
              id: training,
              publicly: 1, // Use the value of the publicity state
              platform: "pico", // Add the selected platform to the request body
              plan: "flex",
              quantity: headsets,
            };

            const response = await addTrainng(requestBody);
          }, 3000);
        }
        if (getPlatforms.some((item) => item.platform === "windows")) {
          const timeout1 = setTimeout(async () => {
            console.log("VVVVVVVVVVVVVV");
            const requestBody = {
              company: company,
              id: training,
              publicly: 1, // Use the value of the publicity state
              platform: "windows", // Add the selected platform to the request body
              plan: "flex",
              quantity: headsets,
            };

            const response = await addTrainng(requestBody);
          }, 3000);
        }
        semaphore.leave();
        return res.status(200).json({
          status: "success",
        });
      } catch (err) {
        semaphore.leave();
        console.log(err);
        return res.status(500).json({ message: "Internal server error" });
      }
    });
  }
  async getTrainngsWithPlans(req, res) {
    try {
      // Fetch all trainings
      const getTrainings = await db("trainings").select("*");

      // Fetch data from the 'getFree', 'getStandard', and 'getPremium' tables
      const getFree = await db("metaenga_free").select("*");
      const getStandard = await db("metaenga_standart").select("*");
      const getPremium = await db("metaenga_premium").select("*");

      // Exclude trainings in "Standard" included in "Free"
      const standardTrainings = getTrainings.filter((training) =>
        getStandard.some(
          (standardTraining) => standardTraining.id === training.id
        )
      );

      const freeTrainings = getFree.map((freeTraining) => freeTraining.id);

      const standardTrainingsFiltered = standardTrainings.filter(
        (training) => !freeTrainings.includes(training.id)
      );

      // Exclude trainings in "Premium" included in "Free" and "Standard"
      const premiumTrainings = getTrainings.filter((training) =>
        getPremium.some((premiumTraining) => premiumTraining.id === training.id)
      );

      const premiumTrainingsFiltered = premiumTrainings.filter(
        (training) =>
          !freeTrainings.includes(training.id) &&
          !standardTrainings.some(
            (stdTraining) => stdTraining.id === training.id
          )
      );

      // Create an object array with three objects (Free, Standard, Premium)
      const resultArray = [
        {
          plan: "Free",
          training: getTrainings.filter((training) =>
            getFree.some((freeTraining) => freeTraining.id === training.id)
          ),
        },
        {
          plan: "Standard",
          training: standardTrainingsFiltered,
        },
        {
          plan: "Premium",
          training: premiumTrainingsFiltered,
        },
      ];

      return res.status(200).json({
        status: "success",
        data: resultArray,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
  async getCompanyWithSubscription(req, res) {
    try {
      const userId = req.params.userId;
      const getCompanyId = await db("userlink").first("*").where({ user: userId });
      const getCompanyData = await db("company").first("*").where({ id: getCompanyId.company });
      console.log(getCompanyData);
  
      const getlog = await db("metaenga_cancel_fondy")
          .where({ company_id: getCompanyId.company })
          .orderBy("id", "desc")
          .first("*");
      let canceldata = getlog ? getlog.status : "not canceled";
  
      let planeer = getCompanyData.plan == "Standart" ? "Standard" : getCompanyData.plan;
  
      const distinctTrainingCount = await db("metaenga_training_company")
          .countDistinct("training as count")
          .where({ company: getCompanyId.company })
          .first();
  
      let fullCapacity;
      if (getCompanyData.plan == "Flex") {
          fullCapacity = 10485760 / 1024;
      } else {
          let getFullCapacity = await db("metaenga_plans").first("*").where({ plan: getCompanyData.plan });
          fullCapacity = getFullCapacity.uploadLimit / 1024;
      }
  
      let getUsedCapacity = await db("metaenga_plan_insight").first("*").where({ companyId: getCompanyId.company });
      let usedCapacity = getUsedCapacity.uploadLimit / 1024;
  
      if (fullCapacity >= 1024) {
          fullCapacity /= 1024;
          fullCapacity = fullCapacity.toFixed(0) + " GB";
      } else {
          fullCapacity = fullCapacity.toFixed(0) + " MB";
      }
  
      if (usedCapacity >= 1024) {
          usedCapacity /= 1024;
          usedCapacity = usedCapacity.toFixed(0) + " GB";
      } else {
          usedCapacity = usedCapacity.toFixed(0) + " MB";
      }
  
      console.log(`Capacity: ${usedCapacity}/${fullCapacity}`);
  
      let compnyId = getCompanyId.company;
      let countDevices = await db("VR")
          .count("id as count")
          .where({ company: compnyId })
          .whereNotNull("userId")
          .first();
  
      let license = getCompanyData.payedLicense;
  
      let getOrderData = await db("metaenga_order_fondy").first("*").where({
          order_company: getCompanyId.company,
          order_status: "success",
      });
  
      let result;
      let flexNextPaymentAmount = null;
      let flexNextPaymentDate = null;
      let subscriptionEndDate = null;
  
      if (getOrderData) {
          let ok = getOrderData.order_id;
          console.log("Order ID", ok);
          let actualDate;
          let getLastPaymentTime = await db("metaenga_subscription_fondy")
              .where({ order_id: ok })
              .orderBy("payment_date", "desc")
              .first("*");
  
          if (!getLastPaymentTime) {
              let getLastPaymentTimePayment = await db("metaenga_payment_fondy")
                  .where({ order_id: ok })
                  .whereNot({ payment_type: "update parent payment" })
                  .orderBy("payment_date", "desc")
                  .first("*");
              actualDate = getLastPaymentTimePayment ? getLastPaymentTimePayment.payment_date : "not paid";
          } else {
              actualDate = getLastPaymentTime.payment_date;
          }
  
          console.log("Last Payment Time", getLastPaymentTime);
          let paymentDate = new Date(actualDate);
          if (getCompanyData.billing_type == "Monthly") {
              paymentDate.setMonth(paymentDate.getMonth() + 1);
          } else {
              paymentDate.setFullYear(paymentDate.getFullYear() + 1);
          }
  
          if (getCompanyData.plan == "Flex" && getCompanyData.customer_id) {
              const subscriptions = await stripe.subscriptions.list({
                  customer: getCompanyData.customer_id,
                  limit: 1,
              });
              if (subscriptions.data.length > 0) {
                  const subscription = subscriptions.data[0];
                  const subscriptionId = subscription.id;
                  const upcomingInvoice = await stripe.invoices.retrieveUpcoming({ subscription: subscriptionId });
                  flexNextPaymentAmount = upcomingInvoice.amount_due / 100;
                  flexNextPaymentDate = new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString();
                  subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();  // Adding subscription end date from Stripe
              } else {
                  console.log('No subscriptions found for this customer.');
              }
          }
  
          console.log("Distinct Training Count", distinctTrainingCount.count);
          result = {
              plan: planeer,
              license: `${countDevices.count}/${license}`,
              trainingCount: distinctTrainingCount.count,
              uploadLimit: `${usedCapacity}/${fullCapacity}`,
              nextPayment: getCompanyData.plan == "Flex" ? flexNextPaymentDate : (actualDate == "not paid" ? "not paid" : paymentDate.toISOString()),
              subscriptionEnd: subscriptionEndDate || (actualDate == "not paid" ? "not paid" : paymentDate.toISOString()),  // Use subscription end date from Stripe if available
              subscriptionStatus: getOrderData ? "paid" : "not paid",
              subscriptionType: getCompanyData.billing_type,
              subscriptionSummary: getCompanyData.plan == "Flex" ? flexNextPaymentAmount : getCompanyData.monthly_bill,
              masked_card: getOrderData.order_card,
              card_type: getOrderData.order_payment_system,
              cancelInfo: canceldata,
              invoice: getCompanyData.invoice,
          };
          console.log(result);
      } else {
          const latestCronRecord = await db("metaenga_cron")
              .where({ company: getCompanyId.company })
              .orderBy("task_id", "desc")
              .first();
          let licen;
          let subsciptionEning;
          let sum;
  
          if (!latestCronRecord) {
              if (getCompanyData.invoice == 1) {
                  licen = license;
                  subsciptionEning = "not paid";
                  sum = "";
              } else {
                  licen = 3;
                  subsciptionEning = "not paid";
                  sum = getCompanyData.monthly_bill;
              }
          } else {
              licen = license;
              subsciptionEning = latestCronRecord.task_date;
              sum = getCompanyData.monthly_bill;
          }
  
          console.log("Distinct Training Count", distinctTrainingCount.count);
          result = {
              plan: planeer,
              license: `${countDevices.count}/${licen}`,
              trainingCount: distinctTrainingCount.count,
              uploadLimit: `${usedCapacity}/${fullCapacity}`,
              nextPayment: "not paid",
              subscriptionEnd: subsciptionEning,
              subscriptionStatus: "not paid",
              subscriptionType: getCompanyData.billing_type,
              subscriptionSummary: sum,
              masked_card: "not paid",
              card_type: "not paid",
              cancelInfo: canceldata,
              invoice: getCompanyData.invoice,
          };
      }
  
      return res.status(200).json({
          status: "success",
          data: result,
      });
  } catch (error) {
      console.log(error);
      return res.status(500).json({ status: "error", message: error.message });
  }
  
  }
  async setCompanyLicense(req, res) {
    try {
      const { company, license } = req.body;
      const getCompanyData = await db("company").first("*").where({
        id: company,
      });
      let mainUser = getCompanyData.userEmail;
      const countUsers = await db("metaenga_users")
        .count("email as count")
        .where({
          status: "ACTIVE",
        })
        .first();

      if (countUsers.count > license) {
        //set DEACTIVATED all except mainUser
        await db("metaenga_users")
          .whereNot({ email: mainUser })
          .update({ status: "DEACTIVATED" });
        await db("company")
          .where({ id: company })
          .update({ payedLicense: license });
        return res.status(200).json({
          status: "success",
          message: "License changed",
        });
      } else {
        await db("company")
          .where({ id: company })
          .update({ payedLicense: license });
        return res.status(200).json({
          status: "success",
          message: "License changed",
        });
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        status: "error",
        message: "Internal server error",
      });
    }
  }
}
async function addTrainng(requestBody) {
  try {
    const response = await axios
      .post(
        `http://localhost:${process.env.PORT}/vr/add/training/default`,
        requestBody
      )
      .error(function (err) {
        console.log(err);
      });

    return response;
  } catch (error) {
    console.error("Error calling API:", error);
    throw error; // Re-throw the error to be caught in the parent function
  }
}
async function removeTrainng(requestBody) {
  try {
    const response = await axios
      .post(
        `http://localhost:${process.env.PORT}/vr/delete/training/default`,
        requestBody
      )
      .error(function (err) {
        console.log(err);
      });

    return response;
  } catch (error) {
    console.error("Error calling API:", error);
    throw error; // Re-throw the error to be caught in the parent function
  }
}
module.exports = new Manifest();
