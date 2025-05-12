const express = require('express');
const {createUser,updateUser,deleteUser,getUsers,getAdmin,getRemainingLeaveDays,updateProfile,getProfile,getSuperAdmin,getCurrentUser,getEmployeeManager} = require('../Controllers/userController');
const authMiddleware = require('../Middlewares/authMiddleware');
const roleMiddleware = require('../Middlewares/roleMiddleware');
const upload = require('../Middlewares/upload');
const { addUserValidationRules, updateUserValidationRules, updateProfileValidationRules, validate } = require('../Middlewares/validators');
const router = express.Router();

// Create a new user (admin only) 
router.post('/', authMiddleware,roleMiddleware('admin'),upload.single('profilePicture'),addUserValidationRules,validate,createUser);

router.get('/admin', authMiddleware, roleMiddleware('manager'),getAdmin);
router.get("/superadmin", authMiddleware, roleMiddleware("admin"), getSuperAdmin);
router.get("/manager", authMiddleware, roleMiddleware("employee"), getEmployeeManager);

router.get('/', authMiddleware, roleMiddleware(['admin','manager','superAdmin']), getUsers);



// Update a user (admin only) with profile picture upload
router.put('/:id',authMiddleware,roleMiddleware('admin'), upload.single('profilePicture'),updateUserValidationRules,validate,updateUser);

// Delete a user (admin only)
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteUser);

router.get("/remaining-leave-days", authMiddleware, getRemainingLeaveDays);

// Get user profile
router.get('/profile/:userId', authMiddleware, getProfile);

// Update user profile
router.put( '/profile/:userId', authMiddleware, upload.single('profileImage'),updateProfileValidationRules,validate,updateProfile);

router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;