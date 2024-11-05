const Router = require("express");
const router = new Router();
const controller = require("../controller/controller");
const company = require("../companyCon/companyCon");
const registration = require("../registration/registration");
const payment = require("../payment/payment");
const classroom = require("../classRoom/classRoom");
const manifest = require("../manifest/manifestUpdate");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const stream = require("../streaming/stream");
const stats = require("../stats/statistic");
const edit = require("../edit/edit");
const uploads = require("../uploads/upload");

const organizationsTotal = require("../admStat/organizationsTotal");
const googleRegistration = require("../registration/registrationGoogle");
const registerMetaenga = require("../registration/formRegistrationCompany");
const confirmationEmail = require("../registration/confirmationEmail");
const sixDigitCodeGeneration = require("../registration/sixDigitCodeGeneration");
const generateToken = require("../registration/generateToken");
const resend = require("../registration/resend");
const checkRegistered = require("../registration/checkRegistered");
const devicesByplatform = require("../admStat/devicesByplatform");
const banner = require("../uploads/banner");
const sendRegistrationLink = require("../registration/sendRegistrationLink");
const companyProfilePage = require("../admStat/companyProfilePage");
const company90Days = require("../admStat/company90Days");
const userStat = require("../admStat/usersStat");
const company7Days = require("../admStat/company7Days");
const company30Days = require("../admStat/company30Days");
const company365Days = require("../admStat/company365Days");
const getInfoContent = require("../admStat/content");
const getInfoSessions = require("../admStat/sessions");
const getCountSessionsByTraining = require("../admStat/getCountSessionsByTraining");
const averageMetrics = require("../admStat/averageMetrics");
const avgTimeSpent7Days = require("../admStat/avgTimeSpent7Days");
const avgTimeSpent30Days = require("../admStat/avgTimeSpent30Days");
const avgTimeSpent90Days = require("../admStat/avgTimeSpent90Days");
const avgTimeSpent365Days = require("../admStat/avgTimeSpent365Days");
const createPDFInvoice = require("../payment/createPDFInvoice");
const getProgressPDF = require("../payment/getProgressPDF");
const getProgressPDFReceipt = require("../payment/getProgressPDFReceipt");
const changeInvoiceStatus = require("../payment/changeInvoiceStatus");
const getInvoiceByCompany = require("../payment/getInvoicesByCompany");
const getAllTrainingsByCompany = require("../controller/getAllTrainingsByCompany");
const changeUserRole = require("../controller/changeUserRole");
const changeUserStatus = require("../controller/changeUserStatus");
const changeLicenses = require("../controller/changeLicenses");
const flexPlanPurchase = require("../payment/flexPlanPurchase");
const VrTrainingProposalMeeting = require("../payment/VrTrainingProposalMeeting");
const FlexPlanProposal = require("../payment/FlexPlanProposal");
const FlexPlanProposalNonRegistered = require("../payment/FlexPlanProposalNonRegistered");
const StandardPlanProposal = require("../payment/StandardPlanProposal");
const StandardPlanProposalNonRegistered = require("../payment/StandardPlanProposalNonRegistered");
const getActiveUsers365Days = require("../appStat/getActiveUsers365Days");
const getAppSessionDuration365Days = require("../appStat/getAppSessionDuration365Days");
const getTrainingSessionCount365Days = require("../appStat/getTrainingSessionCount365Days");
const getVideoSessionCount365Days = require("../appStat/getVideoSessionCount365Days");
const getAppAndWebSessionUserDduration365Days = require("../appStat/getAppAndWebSessionUserDduration365Days");
const getAppAndWebSessionCompanyDuration365Days = require("../appStat/getAppAndWebSessionCompanyDuration365Days");
const getCompletedVrTrainingSessionCount365Days = require("../appStat/getCompletedVrTrainingSessionCount365Days");
const getVrTrainingPDF = require("../payment/VrTrainingPDF");
const getFlexPlanPDF = require("../payment/FlexPlanPDF");
const getStandardPlanPDF = require("../payment/StandardPlanPDF");
const TestFunc = require("../manifest/testFuncForDima");
const flexAssign = require("../payment/joinTraining");
const getFlexTrainingsAssign = require("../payment/getFlexAssign");
const deleteFlexAssigned = require("../payment/deleteFlexAssigned");

const dotenv = require("dotenv");
const db = require("../db");
let queue = require("express-queue");
const statistic = require("../stats/statistic");
dotenv.config();
const upload = multer();
router.get("/check", authenticateToken, (req, res) => {
  //admin
  res.json({
    hello: "world",
  });
});
router.get("/checkUser", verifyUsers, (req, res) => {
  //users
  res.json({
    hello: "world",
  });
});
router.get(
  "/getCompanyList/:admin",
  authenticateToken,
  controller.getCompanyList
);
router.get("/admin/get/table/:admin", company.getAdminTable);
router.get("/get/current/version/:platform", controller.getCurrentVersion);
router.get(
  "/getOneCompany/:admin/:company",
  authenticateToken,
  controller.getOneCompanyList
);
router.get("/getLogo/:id", controller.getLogo);
router.get("/getAvatar/:id", controller.getAvatar);
router.get("/get/video/list/:company", controller.getVideoListByCompany);
router.get("/get/rooms/:company", controller.getRooms);
router.get(
  "/get/video/list/byUser/:company/:user",
  controller.getVideoListByUserAccessList
);
router.get(
  "/get/video/list/byGroup/:company/:groupName",
  controller.getVideoListgGroupAccessList
);
router.get(
  "/get/video/list/combined/:company/:user",
  controller.getVideoListgCombinedAccessList
);
router.get("/getRegLinks/owner/:id", company.getRegistrators);
router.get("/getRegLinks/user/:id", company.getRegistratorsForUser);
router.get(
  "/verifyCode/:email/:code",
  company.getCodeToChangePassIfNotRemember
); //
router.get("/get/data/token", registration.getDataByToken);
router.get("/get/company/video/:company", verifyUsers, company.getVideoList);
router.get("/stream/:company/:serverName", verifyUsers, stream.streamSourceIOS);
router.get("/vr/get/training/:company/:id", controller.getTrainingData);
router.get("/download/:company/:serverName/:resolution", stream.downloadSource);
router.get("/getUserInfo/:userId", verifyUsers, company.getUserInfo);
router.get("/getCompanyUsers/:companyId", company.getCompanyUsers);
router.get("/getCompanyInfo/:companyId", verifyUsers, company.getCompanyInfo);
router.get("/getCompanyGroups/:companyId", company.getGroupUsers);
router.get(
  "/getGroupUsers/:companyId/:groupName",
  verifyUsers,
  company.getOneGroupUsers
);

router.post("/register/owner/free", registration.registerFree); //
router.get("/getDomain", registration.getDomain);

router.post("/register/owner/confirmation", registration.confirmation);
router.post("/register", controller.reg);
router.post("/login", controller.log, errorHandler);
router.post("/addCompany", authenticateToken, controller.addCompany);
router.post("/deleteCompany", authenticateToken, controller.deleteCompany);
router.post("/freezeCompany", authenticateToken, controller.freezeCompany);
router.post("/unFreezeCompany", authenticateToken, controller.unFreezeCompany);
router.post("/saveLogs", authenticateToken, controller.SaveLog);
router.post("/editCompany", authenticateToken, controller.editCompany);
router.post("/upload/logo/:id", upload.single("file"), uploads.uploadLogo);
router.post("/upload/avatar/:id", upload.single("file"), uploads.uploadAvatar);
router.post(
  "/upload/poster/:training",
  upload.single("file"),
  uploads.uploadPoster
);
router.post(
  "/upload/poster/video/:id",
  upload.single("file"),
  uploads.uploadPoster360Video
);
router.post(
  "/upload/banner/:company",
  upload.single("file"),
  uploads.uploadBanner
);
router.post("/banner/check/:company", uploads.checkAvailableBanner);
router.post("/getDataFromLink", company.getDataFromLink);
router.post("/user/logout", company.logout);
router.post("/stats/library/web", stats.webStatsAddLib);
router.post("/stats/library/vr", stats.vrStatsAddLib);
router.post("/stats/download/web", stats.webDownloadStat);
router.post("/stats/download/vr", stats.vrDownloadStat);
// router.post('/stats/upload/video', stats.uploadVideoTotal)
router.post("/stats/download/vr/training", stats.vrTrainingsDownloadStat);
router.post("/add/video/toRoom", controller.addVideoToRoom);
router.post("/delete/room", controller.deleteRoom); //видалення класруму
router.post("/create/room", controller.createRoom); //створення класруму
router.post("/get/one/video/info", classroom.getVideoInfo);
router.post("/regLink", company.regLink);
router.post("/register/user", company.adminRegLink); //
router.post("/register/owner", company.ownerReg); //
router.post("/authenticate/user", company.authUsers);
router.post("/authenticate/vr/user", company.authUsersVR);
router.post("/deleteInvite/dev", company.deleteInviteDev); //***
router.post("/deleteInvite/owner", verifyUsers, company.deleteInviteOwner);
router.post("/deleteInvite/admin", verifyUsers, company.deleteInviteAdmin);
router.post("/createBasic", company.createBasic);
router.post("/editUsers", verifyUsers, company.editUsers); //
router.post("/changePass", company.changePass); //
router.post("/sendPassRecovery", company.sendEmailToChangePassIfNotRemember); // додати сюди листа
router.post("/acceptPassRecovery", company.changePassIfNotRemember); //
router.post("/createClass", verifyUsers, classroom.createClassRoom);
router.post("/deleteVideo", verifyUsers, classroom.DeleteVideo);
router.post("/deleteClassRoom", verifyUsers, classroom.deleteClassRoom);
router.post("/addVideoToClassRoom", verifyUsers, classroom.addVideoToClassRoom);
router.post("/editVideo", verifyUsers, company.editVideo);
router.delete("/deleteAvatar/:id", verifyUsers, controller.deleteAvatar);
router.delete("/deleteLogo/:id", verifyUsers, controller.deleteLogo);
router.post("/createGroup", verifyUsers, company.createGroup);
router.post("/addToGroup", verifyUsers, company.addToGroup);
router.post("/addContentToGroup", verifyUsers, company.addContentToGroup);
router.post("/addContentToUser", verifyUsers, company.addContentToUser); //client_video
router.post("/changeRole", company.changeRole);
router.post(
  "/deleteAccessFromGroup",
  verifyUsers,
  company.deleteAccessFromGroup
);
router.post(
  "/deleteAccessFromUsers",
  verifyUsers,
  company.deleteAccessFromUsers
);
router.post(
  "/deleteGroup",
  verifyUsers,
  queue({
    activeLimit: 1,
    queuedLimit: 20,
    rejectHandler: (req, res) => {
      res.sendStatus(500);
    },
  }),
  company.deleteGroup
);
router.post("/editUserByAdmin", verifyUsers, company.editUserByAdmins);
router.post("/deactivate/user", verifyUsers, company.deactivateUser);
router.post("/activate/user", verifyUsers, company.activateUser);
router.post("/delete/user", verifyUsers, company.DeleteUserIfDeactivated);
router.post(
  "/vr/folder/create/:company/:version",
  verifyUsers,
  controller.createFolder
);
router.post(
  "/delete/group/user",
  verifyUsers,
  queue({
    activeLimit: 1,
    queuedLimit: 20,
    rejectHandler: (req, res) => {
      res.sendStatus(500);
    },
  }),
  company.deleteUserFromGroup
);
router.post("/vr/add/training", verifyUsers, controller.AddVrTraining); //
router.post(
  "/vr/add/training/toUser",
  verifyUsers,
  controller.AddVrTrainingToUser
);
router.post(
  "/vr/delete/training/fromUser",
  verifyUsers,
  controller.DeleteVrTrainingFromUser
);

router.post(
  "/vr/delete/training",
  authenticateToken,
  controller.DeleteVrTrainingFromManifest
); //видалення з платформи
router.post("/vr/add/training/default", controller.AddVrDefaultTraining); //ready
router.post("/vr/delete/training/default", controller.DeleteVrDefaultTraining); //ready
router.get(
  "/vr/get/training/byUser/:company/:user/:platform",
  controller.getTrainingDataByUser
);

router.get(
  "/vr/get/user/training/:company/:user",
  controller.getUserTrainingData
);
router.get("/vr/get/trainings", controller.getTrainings);
router.get("/get/plans/:plan", controller.getPlans);
router.post("/uploadBunny/:company", upload.any(), uploads.uploadVideoBunny); //додавання відео на платформу від компаній
router.post(
  "/vr/upload/training/onCompany/:company",
  multer().any(),
  uploads.uploadVrTraining
);
router.post(
  "/vr/upload/training/default",
  multer().any(),
  uploads.uploadVrTrainingDefault
); //додавання тренінгу на платформу
router.post(
  "/editCompanyInfo/:companyId",
  verifyUsers,
  company.editCompanyInfo
);
router.post("/addDemoVR", classroom.addDemoVR);
router.post("/addVR", classroom.addExistedVR);
router.post("/info/mail/send", company.infoMailing);
router.post("/info/waitlist/send", company.infoWaitlist);
router.post("/info/get/quote", company.infoGetQuotet);
// router.post('/createVrGroup', company.creatrVrGroup)//
// router.post('/deleteVrGroup', company.deleteVrGroup)//
// router.post('/addToVrGroup', company.addToVrGroup)//
// router.post('/deleteFromVrGroup', company.deleteFromVrGroup)//
router.post("/addVrContentToGroup", company.addVrContentToGroup);
router.post("/deleteVrContentFromGroup", company.deleteVrContentFromGroup);
router.get(
  "/get/training/byGroup/:company/:groupName",
  controller.getTrainingGroupAccessList
);

router.post(
  "/vr/update/training/:platform",
  multer().any(),
  controller.updateVrTraining
); //ОБНОВЛЯЕТ ТОЛЬКО ВИДЕО ОТ METAENGA

router.post("/vrAppSessionStart", statistic.vrAppSessionStart);
router.post("/vrAppSessionEnd", statistic.vrAppSessionEnd);
router.post("/endVrAppSessionDelayed", statistic.endVrAppSessionDelayed); //
router.post("/vrTrainingSessionStart", statistic.vrTrainingSessionStart); //
router.post("/vrTrainingSessionEnd", statistic.vrTrainingSessionEnd);
router.post("/videoSessionStart", statistic.videoSessionStart); //
router.post("/videoSessionEnd", statistic.videoSessionEnd); //
router.post("/vrTrainingActionPerformed", statistic.vrTrainingActionPerformed);
router.post(
  "/vrTrainingRuntimeErrorHandle",
  statistic.vrTrainingRuntimeErrorHandle
);
router.get(
  "/getVrAppSession/:company/:month/:year",
  statistic.getVrAppSessionForMonth
);

router.get("/getCompanyDevices/:company", controller.getCompanyDevices);
router.get("/getDevice/:device/:company", controller.getDevice);

//router.post('/webSessionStart', statistic.webSessionStart)
router.post(
  "/webSession/:company/:userId/:timeEnd/:duration",
  statistic.webSession
); //

router.get("/getWebSession/12weeks/:company", statistic.getWebSessionForWeeks);

router.get("/getTotalTrainings/:company", statistic.getTotalTrainings); //++
router.get("/getTotalUsers/:company", statistic.getTotalUsers); //++

router.get(
  "/getAppSession/duration/12weeks/:company",
  statistic.getVrAppSessionDurationForWeeks
); //+
router.get(
  "/getAppSession/duration/1week/:company",
  statistic.getVrAppSessionDurationForOneWeek
); //+
router.get(
  "/getAppSession/duration/12month/:company",
  statistic.getVrAppSessionDurationForYEAR
); //+
router.get(
  "/getAppSession/count/12month/:company",
  statistic.getVrAppSessionCountForYEAR
); //+
router.get(
  "/getAppSession/count/12weeks/:company",
  statistic.getVrAppSessionCountForWeeks
); //+
router.get(
  "/getAppSession/count/1week/:company",
  statistic.getVrAppSessionCountForOneWeek
); //+

router.get(
  "/getAverageDurationOfTrainingSession/allTime/:company",
  statistic.getAverageDurationOfTrainingSession
); //++
router.get(
  "/getTotalTrainingSession/allTime/:company",
  statistic.getTotalTrainingSessionInCompanyForAllTime
); //++
router.get(
  "/getTrainingSession/count/12weeks/:company",
  statistic.getVrTrainingSessionCountForWeeks
); //+
router.get(
  "/getTrainingSession/count/1week/:company",
  statistic.getVrTrainingSessionCountForOneWeek
); //+
router.get(
  "/getTrainingSession/count/12month/:company",
  statistic.getVrTrainingSessionCountForYEAR
); //+
router.get(
  "/getTrainingSession/duration/12month/:company",
  statistic.getVrTrainingSessionDurationForYEAR
); //+
router.get(
  "/getTrainingSession/duration/12weeks/:company",
  statistic.getVrTrainingSessionDurationForWeeks
); //+
router.get(
  "/getTrainingSession/duration/1week/:company",
  statistic.getVrTrainingSessionDurationForOneWeek
); //+
router.get("/getVRTrainingData/:company", statistic.getVRTrainingData); //++

router.get(
  "/getAvgVRTrainingSessionPerUser/allTime/:company",
  statistic.getAvgVRTrainingSessionPerUser
); //++
router.get(
  "/getAppAndWebSession/duration/12weeks/:company",
  statistic.getVrAppAndWebSessionDurationForWeeks
); //+
router.get(
  "/getAppAndWebSession/duration/1week/:company",
  statistic.getVrAppAndWebSessionDurationForOneWeek
); //+
router.get(
  "/getAppAndWebSession/duration/12month/:company",
  statistic.getVrAppAndWebSessionDurationForYEAR
); //+
router.get("/getUsersData/:company", statistic.getUsersData); //++

router.get(
  "/getAvgViewingTimeVideo/:company",
  statistic.getAvgViewingTimeVideo
); //++
router.get(
  "/getTotalCountSessionVideo/:company",
  statistic.getTotalCountSessionVideo
); //++
router.get(
  "/getVideoSession/count/12weeks/:company",
  statistic.getVideoSessionCountForWeeks
); //+
router.get(
  "/getVideoSession/count/1week/:company",
  statistic.getVideoSessionCountForOneWeek
); //+
router.get(
  "/getVideoSession/count/12month/:company",
  statistic.getVideoSessionCountForYEAR
); //+
router.get("/getVideoData/:company", statistic.getVideoData); //++

router.get(
  "/getPlatformTimeUser/:company/:user",
  statistic.getPlatformTimeUser
); //++
router.get("/getVideoTimeUser/:company/:user", statistic.getVideoTimeUser); //++
router.get(
  "/getAppAndWebSessionUser/duration/12weeks/:company/:user",
  statistic.getVrAppAndWebSessionDurationUserForWeeks
); //+
router.get(
  "/getAppAndWebSessionUser/duration/1week/:company/:user",
  statistic.getVrAppAndWebSessionDurationUserForOneWeek
); //+
router.get(
  "/getAppAndWebSessionUser/duration/12month/:company/:user",
  statistic.getVrAppAndWebSessionDurationUserForYEAR
); //+

//белая стата
router.get(
  "/getCompletedVrTrainingSession/count/12weeks/:company",
  statistic.getCompletedVrTrainingSessionCountForWeeks
); //+
router.get(
  "/getCompletedVrTrainingSession/count/1week/:company",
  statistic.getCompletedVrTrainingSessionCountForOneWeek
); //+
router.get(
  "/getCompletedVrTrainingSession/count/12month/:company",
  statistic.getCompletedVrTrainingSessionCountForYEAR
); //+
router.get(
  "/getActiveUsers/count/12weeks/:company",
  statistic.getActiveUsersForWeeks
); //+
router.get(
  "/getActiveUsers/count/1week/:company",
  statistic.getActiveUsersForOneWeek
); //+
router.get(
  "/getActiveUsers/count/12month/:company",
  statistic.getActiveUsersForYEAR
); //+

router.get(
  "/getPercentCompletedToUncompletedTrainings/:company",
  statistic.getPercentCompletedToUncompletedTrainings
); //++
router.get(
  "/getAvgVRCompletedTrainingSessionPerUser/allTime/:company",
  statistic.getAvgVRCompletedTrainingSessionPerUser
); //++
router.get(
  "/getPercentCompletedToUncompletedVideo/:company",
  statistic.getPercentCompletedToUncompletedVideo
); //+
router.get(
  "/getAvgVRTrainingPerUser/:company",
  statistic.getAvgVRTrainingPerUser
); //

router.get(
  "/getTrainingSessionData/:company/:trainingId",
  statistic.getTrainingSessionData
); //получаю дату про все тренинг сессиям по компании и тренингу
router.get(
  "/getTrainingSessionDataByUser/:company/:user/:trainingId",
  statistic.getTrainingSessionDataByUser
); //получаю дату про все тренинг сессиям по юзеру
router.post("/deleteDevice/:company/:deviceId", statistic.deleteDevice);
router.post(
  "/updateNameDevice/:company/:deviceId/:newName",
  statistic.updateNameDevice
);

router.post(
  "/updateCompanyDevices",
  verifyUsers,
  controller.updateCompanyDevices
);
router.post("/upgrade/plan", controller.upgradePlan);
router.post(
  "/change/training/publicity/:company/:id/:publicity",
  controller.changeTrainingPublicity
);

router.post(
  "/upload/metaenga/video",
  upload.any(),
  uploads.uploadVideoMetaengaBunny
); //непонятно шо
router.post(
  "/upload/metaenga/video/default",
  upload.any(),
  uploads.uploadVideoMetaengaBunnyDefault
); //додавання відео від метаенга
router.post("/delete/metaenga/video/default",uploads.deleteVideoMetaengaBunnyDefault)
router.post("/video/add/to/company", controller.addVideoToCompany); //metaenga_video
router.post("/video/add/to/user", controller.addVideoToUser); //metaenga_video
router.post("/video/remove/from/company", controller.removeVideoFromCompany);
router.post("/video/remove/from/user", controller.removeVideoFromUser);
router.get("/video/byUser/:user", controller.getVideoListByUser);
router.get(
  "/download/metaenga/:serverName/:resolution",
  stream.downloadSourceMetaenga
);
router.get(
  "/get/video/metaenga/byOwner/:company",
  controller.getVideoListForOwner
);
router.post("/xapi/edp", TestFunc);
router.get(
  "/get/videos/forAdmin",
  authenticateToken,
  controller.getVideoListForAdmin
);
router.get(
  "/get/exact/video/forAdmin/:id",
  authenticateToken,
  controller.getExactVideoForAdmin
);
router.post(
  "/edit/exact/video/forAdmin/:id",
  authenticateToken,
  controller.editExacVideoForAdmin
);
router.post(
  "/register/company/metaenga",
  registerMetaenga.formRegistrationCompany
);
router.post(
  "/confirmation/company/metaenga",
  confirmationEmail.confirmationEmail
); //
router.post("/register/company/google", googleRegistration.googleRegistration);
router.post(
  "/six/code/generation",
  sixDigitCodeGeneration.sixDigitCodeGeneration
);
router.post("/generateToken", generateToken.generateToken);
router.post("/resend", resend.resendEmail);
router.get("/check/registered/:email", checkRegistered.checkRegistered);

router.post("/processPayment", controller.processPayment);

router.post(
  "/sendActivateAccountLetter ",
  controller.sendActivateAccountLetter
);
router.put("/loops/:email", controller.loops);

router.get(
  "/get/companies/byTraining/:training",
  controller.getCompaniesByTraining
);
router.get(
  "/get/companies/byVideo/:id",
  controller.getCompaniesByVideo
);
router.get(
  "/get/platforms/byTraining/:training",
  controller.getPlatformsByTraining
);

router.get("/get/default/training/VR", controller.getDefaultTrainingVR);

router.post("/add/training/toPlan/:training/:plan", manifest.addTrainingToPlan); //фри, старт, преміум
router.post(
  "/remove/training/toPlan/:training/:plan",
  manifest.removeTrainingToPlan
);
router.post("/edit/training/:id", edit.editTraininById);
router.post("/vr/exclusive/add/training", manifest.addTrainingExclusive); //ексклюзив
router.post("/vr/exclusive/remove/training", manifest.removeTrainingExclusive);

router.post("/vr/flex/add/training", manifest.addTrainingFlex); //флекс

router.post("/fondy/callback", payment.fondyCallback);
router.post("/fondy/callback/year", payment.fondyCallbackYear);

router.post("/fondy/subscription/callback", payment.fondyCallbackSubscription);
router.post(
  "/fondy/subscription/callback/year",
  payment.fondyCallbackSubscriptionYear
);
router.get("/get/pricing/:plan", payment.getPricing);
router.get("/get/payment/history/:companyId", payment.getPaymentHistory);
router.get("/get/payment/receipt/:companyId", payment.getPaymentReceipt);
router.post("/order", payment.order);
router.post("/order/enterprise", payment.orderEnterprise)
router.post("/order/test", payment.test);
router.post("/order/flex", payment.prodFlex);
//test
router.get("/get/subscriptions/products/:userId", payment.getSubscriptions);
router.post("/add/product/to/subscription", payment.addProductToSubscription);
router.post("/flex/cancel", payment.flexCancel);
router.post("/flex/360/cancel", payment.flex360Cancel);
router.post("/update/flex/subscription", payment.updateFlexSubscription);
router.post(
  "/remove/product/from/subscription",
  payment.removeProductFromSubscription
);
router.post("/join/training", flexAssign.joinTraining);
router.get("/get/training/assign/:headset", getFlexTrainingsAssign);
router.delete("/delete/training/assign/:headset/:training", deleteFlexAssigned);
//test
router.post("/orderVR", payment.orderVR);
router.post("/order/year", payment.orderYear);
router.get("/order/get/card/:userId", payment.getCard);
router.post("/order/webhook", payment.orderSuccessCallback);
router.post("/subscription/webhook", payment.subscriptionSuccessCallback);
router.post("/order/remove/licenses", payment.removeLicenses);
router.post("/order/update", payment.orderUpdate);
router.post("/subscription/pay", payment.subscriptionPay);
router.post("/order/cancel/:userId", payment.subscriptionCancelStripe);
router.post("/order/renew/:userId", payment.subscriptionRenewStripe);
router.post("/subscription/cancel/:userId", payment.subscriptionCancel);
router.post(
  "/subscription/year/cancel/:userId",
  payment.subscriptionCancelYear
);
router.post("/subscription/reverse", payment.subscriptionReverse);
router.post(
  "/get/monthly/payment/:payment/:companyId",
  payment.getMonthlyPayment
);

router.get("/get/trainings/via/plans", manifest.getTrainngsWithPlans);
router.get(
  "/get/company/via/subscription/:userId",
  manifest.getCompanyWithSubscription
);
router.post("/set/company/license", manifest.setCompanyLicense);

router.post(
  "/send/registration/link",
  sendRegistrationLink.sendRegistrationLink
);

router.get("/get/total/company", organizationsTotal.organizationsTotal); //+
router.get("/get/company/count/seven/days", company7Days.company7Days); //+
router.get("/get/company/count/thirty/days", company30Days.company30Days); //+
router.get("/get/company/count/ninety/days", company90Days.company90Days); //+
router.get("/get/company/count/year", company365Days.company365Days); //+
router.get(
  "/get/count/devices/by/platform",
  devicesByplatform.getCountOfDevicesByPlatform
); //+
router.get("/get/users/stat", userStat.usersStat); //+
router.get("/get/info/content", getInfoContent.getInfoContent); //+
router.get("/get/info/sessions", getInfoSessions.getInfoSessions); //+
router.get(
  "/get/count/sessions/by/training",
  getCountSessionsByTraining.getCountSessionsByTraining
); //+
router.get("/get/average/metrics", averageMetrics.getAvgMetrics); //+
router.get(
  "/get/average/time/spent/seven/days",
  avgTimeSpent7Days.avgTimeSpent7Days
); //+
router.get(
  "/get/average/time/spent/thirty/days",
  avgTimeSpent30Days.avgTimeSpent30Days
); //+
router.get(
  "/get/average/time/spent/ninety/days",
  avgTimeSpent90Days.avgTimeSpent90Days
); //+
router.get(
  "/get/average/time/spent/year",
  avgTimeSpent365Days.avgTimeSpent365Days
); //+

router.post("/create/pdf/invoice", createPDFInvoice.createPDFInvoice);
router.get("/get/progress/pdf/:invoiceId", getProgressPDF.getProgressPDF);
router.get(
  "/get/progress/pdf/receipt/:orderId",
  getProgressPDFReceipt.getProgressPDFReceipt
);
router.get(
  "/get/company/profile/page/:company",
  companyProfilePage.companyProfilePage
);

router.post("/change/invoice/status", changeInvoiceStatus.changeInvoiceStatus); //1212
router.get(
  "/get/invoices/by/company/:companyId",
  getInvoiceByCompany.getInvoicesByCompany
); //1212
router.get("/get/company/banner/:company", banner.getBanner);
router.get(
  "/get/all/trainings/by/company/:company",
  getAllTrainingsByCompany.getAllTrainingsByCompany
);
router.post("/change/user/role", changeUserRole.changeUserRole);
router.post("/change/user/status", changeUserStatus.changeUserStatus);
router.post("/change/licenses", changeLicenses.changeLicenses);

router.post("/flex/plan/purchase", flexPlanPurchase.flexPlanPurchase);

router.get(
  "/get/active/users/year/:company",
  getActiveUsers365Days.getActiveUsers365Days
);
router.get(
  "/get/app/session/duration/year/:company",
  getAppSessionDuration365Days.getAppSessionDuration365Days
);
router.get(
  "/get/training/session/count/year/:company",
  getTrainingSessionCount365Days.getTrainingSessionCount365Days
);
router.get(
  "/get/video/session/count/year/:company",
  getVideoSessionCount365Days.getVideoSessionCount365Days
);
router.get(
  "/get/app/web/session/user/duration/year/:company/:user",
  getAppAndWebSessionUserDduration365Days.getAppAndWebSessionUserDduration365Days
);
router.get(
  "/get/app/web/session/company/duration/year/:company",
  getAppAndWebSessionCompanyDuration365Days.getAppAndWebSessionCompanyDuration365Days
);
router.get(
  "/get/completed/vr/training/session/count/year/:company",
  getCompletedVrTrainingSessionCount365Days.getCompletedVrTrainingSessionCount365Days
);
router.post(
  "/vr/training/proposal/meeting",
  VrTrainingProposalMeeting.VrTrainingProposalMeeting
);
router.get("/get/vr/training/pdf", getVrTrainingPDF.VrTrainingPDF);
router.post("/vr/flex/proposal/meeting/:id", FlexPlanProposal.FlexPlanProposal);
router.get("/get/flex/plan/pdf", getFlexPlanPDF.FlexPlanPDF);
router.post(
  "/vr/standard/proposal/meeting/:id",
  StandardPlanProposal.StandardPlanProposal
);
router.get("/get/standard/plan/pdf", getStandardPlanPDF.StandardPlanPDF);
router.post(
  "/vr/flex/proposal/meeting/nonRegistered/:email",
  FlexPlanProposalNonRegistered.FlexPlanProposalNonRegistered
);
router.post(
  "/vr/standard/proposal/meeting/nonRegistered/:email",
  StandardPlanProposalNonRegistered.StandardPlanProposalNonRegistered
);

router.get("/get/order", async (req, res) => {
  db.select(
    "metaenga_order_fondy.merchant_id",
    "metaenga_order_fondy.order_date", // выберите все поля из таблицы metaenga_order_fondy
    "metaenga_payment_fondy.payment_id" // выберите все поля из таблицы metaenga_payment_fondy
  )
    .from("metaenga_order_fondy")
    .join(
      "metaenga_payment_fondy",
      "metaenga_order_fondy.order_id",
      "metaenga_payment_fondy.order_id"
    )
    .then((data) => {
      console.log(data); // вывод результата в консоль
      return res.status(200).json({
        status: "ok",
        data: data,
      });
    })
    .catch((error) => {
      console.error(error); // вывод ошибки в консоль
    });
});

//newManifest

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(405);
  jwt.verify(token, process.env.TOKEN_SECRET, (err) => {
    console.log(err);
    if (err) return res.sendStatus(406);
    next();
  });
}
function verifyUsers(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(405);
  jwt.verify(token, process.env.USER_TOKEN, (err) => {
    console.log(err);
    if (err) return res.sendStatus(406);
    next();
  });
}
function errorHandler(error, userId, next) {
  try {
    const time = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");

    db("metaenga_error").insert({
      userId: userId,
      error: error,
      time: time,
    });

    next();
  } catch (error) {
    console.log(error);
  }
}

module.exports = router;
