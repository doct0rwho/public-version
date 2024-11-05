const db = require("../db");

async function getCountSessionsByTraining(req, res) {
  try {
    // Отримати всі тренінги
    const allTrainings = await db("trainings").select("*");

    const result = [];

    // Пройтися по кожному тренінгу
    for (let i = 0; i < allTrainings.length; i++) {
      const training = allTrainings[i];

      // Отримати кількість сесій для поточного тренінгу
      const countSessions = await db("metaenga_vr_training_session")
        .count("trainingSessionId as count")
        .where("trainingId", "=", training.id)
        .first();

      // Додати результат до масиву
      result.push({
        label: `Tr ${i + 1}`,
        fullname: training.name,
        value: countSessions.count || 0,
      });
    }

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ status: "error", data: error });
  }
}

module.exports.getCountSessionsByTraining = getCountSessionsByTraining;
