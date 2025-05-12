const express = require('express');
const router = express.Router();
const departmentController = require('../Controllers/departmentController');

// Route to get all departments (with managers and employees)
router.get('/', departmentController.getAllDepartments);

// Route to create a new department
router.post('/', departmentController.createDepartment);

// Route to edit a department
router.put('/:id', departmentController.updateDepartment);

// Route to delete a department
router.delete('/:id', departmentController.deleteDepartment);

router.get("/available-managers", departmentController.getAvailableManagers);

// Route to get assignable employees
router.get("/assignable-employees", departmentController.getAssignableEmployees); 

module.exports = router;
