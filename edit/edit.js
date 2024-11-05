const dotenv = require("dotenv");
const db = require("../db");
dotenv.config();

class Edit {
  async editTraininById(req, res) {
    const id = req.params.id;
    const {
      name,
      description,
      shortDescription,
      category,
      features,
      objectives,
      audience,
      modes,
      assessment,
      available,
      lang,
      numberOfScenarios,
      area,
      createdAt,
      duration,
    } = req.body;
    const check = await db("trainings").select("*").where({ id: id });
    if (!check) return res.status(404).json({ message: "Training not found" });
    const edit = await db("trainings")
      .where({ id: id })
      .update({
        name: name,
        description: description,
        shortDescription: shortDescription,
        category: category,
        features: features,
        objectives: objectives,
        audience: audience,
        modes: modes,
        assessment: assessment,
        available: available,
        lang: lang,
        numberOfScenarios: numberOfScenarios,
        area: area,
        createdAt: createdAt,
        duration: duration,
      });
    return res.status(200).json({ message: "Training updated" });
  }
}
module.exports = new Edit();
