import { Router } from 'express';
import { listApplications, getStats, getApplication, createApplication, updateApplication, changeStatus, deleteApplication } from '../controllers/applicationController.js';

const router = Router();
router.get('/stats', getStats);
router.get('/', listApplications);
router.post('/', createApplication);
router.get('/:id', getApplication);
router.put('/:id', updateApplication);
router.patch('/:id/status', changeStatus);
router.delete('/:id', deleteApplication);
export default router;
