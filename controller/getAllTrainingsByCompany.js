const con = require("../db");
const db = require("../db");
async function getAllTrainingsByCompany(req, res) {
  try {
    const company = req.params.company;

    const plan = await db("company").first("plan").where({ id: company });

    const check = await db("metaenga_training_user").first("*").where({
      company: company,
    });
    const userTrainings = await db("metaenga_training_user")
      .pluck("training")
      .where({
        company: company,
      });

    const trainingsUser = await db("trainings")
      .select("*")
      .whereIn("id", userTrainings);
    const companyTrainings = await db("metaenga_training_company")
      .pluck("training")
      .where({
        company: company,
        default: 1,
      });

    const trainingsCompany = await db("trainings")
      .select("*")
      .whereIn("id", companyTrainings);
    const mergedArray = trainingsUser.concat(trainingsCompany);

    if (!check && mergedArray.length === 0) {
      return res.status(404).json({ status: "user have no trainings" });
    }

    const uniqueArray = mergedArray.filter((item, index) => {
      return (
        index ===
        mergedArray.findIndex((obj) => {
          return JSON.stringify(obj) === JSON.stringify(item);
        })
      );
    });

    const groupNames = await db("metaenga_member_of_group")
      .pluck("groupName")
      .where({
        companyId: company,
      });

    const GroupTrainingsId = await db("metaenga_group_vr_access")
      .pluck("contentId")
      .whereIn("vrGroupName", groupNames);
    const groupTrainings = await db("trainings")
      .select("*")
      .whereIn("id", GroupTrainingsId);
    const mergedArray2 = uniqueArray.concat(groupTrainings);

    const finalArray = Array.from(
      new Set(mergedArray2.map(JSON.stringify))
    ).map(JSON.parse);

    console.log(plan);
    let trainings = [];
    if (plan.plan.toLowerCase() != "flex") {
      let table = `metaenga_${plan.plan.toLowerCase()}`;
      const plans = await db(table).select("*");
      trainings = await db("trainings")
        .select("*")
        .whereIn(
          "id",
          plans.map((item) => item.id)
        );
        trainings = trainings.map((training) => ({
          ...training,
          type: plan.plan
        }));
    }else{
      let table = `metaenga_free`;
      const plans = await db(table).select("*");
      trainings = await db("trainings")
        .select("*")
        .whereIn(
          "id",
          plans.map((item) => item.id)
        );
        trainings = trainings.map((training) => ({
          ...training,
          type: "Free"
        }));
    }
    console.log(trainings);

    const commonTrainings = trainings.filter((training) =>
      finalArray.some((f) => f.id === training.id)
    );
    console.log(commonTrainings);

    // Find trainings present in finalArray but not in trainings array
    const trainingsNotInTrainingsArray = finalArray.filter(
      (f) => !trainings.some((training) => training.id === f.id)
    );
    const test = await db("metaenga_training_company")
    .select("training", "plan")
    .distinct("training")
    .where({
      company: company,
      default: 1,
    });
    const trainingPlanLookup = test.reduce((acc, { training, plan }) => {
      acc[training] = plan;
      return acc;
    }, {});
    
    const capitalizeFirstLetter = (string) => {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };
    console.log(trainings)
    const combinedArray = [
      ...trainings.map((training) => ({ name: training.name, type: training.type })),
      ...trainingsNotInTrainingsArray.map((training) => {
        const planType = trainingPlanLookup[training.id] || "Exclusive";
        return {
          name: training.name,
          type: capitalizeFirstLetter(planType),
        };
      }),
    ];

    return res.status(200).json({
      status: "success",
      data: combinedArray,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      data: "Internal server error",
    });
  }
}
module.exports.getAllTrainingsByCompany = getAllTrainingsByCompany;
