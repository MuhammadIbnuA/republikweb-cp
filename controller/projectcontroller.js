const moment = require('moment');
const { db } = require('../firebase.js'); // Adjust the path as needed
const admin = require('firebase-admin');

const addProject = async (req, res) => {
    try {
        const { projectname, members, description, startdate, enddate } = req.body;
        const projectId = `project-${moment().format('YYYYMMDDHHmmss')}`;

        const projectData = {
            projectId,
            projectname,
            members,
            description,
            startdate: new Date(startdate),
            enddate: new Date(enddate)
        };

        const projectRef = db.collection('projects').doc(projectId);
        await projectRef.set(projectData);

        res.status(201).json({ message: 'Project created successfully', projectData });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ message: 'Error creating project', error: error.message });
    }
};

const getAllProjects = async (req, res) => {
    try {
        const snapshot = await db.collection('projects').get();
        const projects = snapshot.docs.map(doc => doc.data());

        res.status(200).json(projects);
    } catch (error) {
        console.error('Error getting projects:', error);
        res.status(500).json({ message: 'Error getting projects', error: error.message });
    }
};

const getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectRef = db.collection('projects').doc(projectId);
        const doc = await projectRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.status(200).json(doc.data());
    } catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({ message: 'Error getting project', error: error.message });
    }
};

const getProjectsByKaryawanId = async (req, res) => {
    try {
        const { karyawanId } = req.params;
        const snapshot = await db.collection('projects').where('members', 'array-contains', karyawanId).get();
        const projects = snapshot.docs.map(doc => doc.data());

        res.status(200).json(projects);
    } catch (error) {
        console.error('Error getting projects by karyawanId:', error);
        res.status(500).json({ message: 'Error getting projects by karyawanId', error: error.message });
    }
};

const getMembersOfProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const projectRef = db.collection('projects').doc(projectId);
        const doc = await projectRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Project not found for get member of project' });
        }

        const project = doc.data();

        // Log the project members data to see its structure
        console.log('Project members data:', project.members);

        // Check if project.members is an array
        if (!Array.isArray(project.members)) {
            return res.status(400).json({ message: 'Invalid project members data' });
        }

        const membersPromises = project.members.map(async memberId => {
            const memberRef = db.collection('karyawan').doc(memberId);
            const memberDoc = await memberRef.get();

            if (!memberDoc.exists) {
                return { karyawanId: memberId, name: 'Unknown', role: 'Unknown' };
            }

            const memberData = memberDoc.data();
            return {
                karyawanId: memberId,
                name: memberData.fullname,
                role: memberData.division // Use division as the role
            };
        });

        const members = await Promise.all(membersPromises);

        res.status(200).json(members);
    } catch (error) {
        console.error('Error getting members of project:', error);
        res.status(500).json({ message: 'Error getting members of project', error: error.message });
    }
};

const getActiveProjects = async (req, res) => {
    try {
        const now = new Date();
        const snapshot = await db.collection('projects')
            .where('startdate', '<=', now)
            .where('enddate', '>=', now)
            .get();
        const projects = snapshot.docs.map(doc => doc.data());

        res.status(200).json(projects);
    } catch (error) {
        console.error('Error getting active projects:', error);
        res.status(500).json({ message: 'Error getting active projects', error: error.message });
    }
};

const addKaryawanToProject = async (req, res) => {
    try {
        const { projectId, karyawanId } = req.body;
        const projectRef = db.collection('projects').doc(projectId);
        const karyawanRef = db.collection('karyawan').doc(karyawanId);
        const karyawanDoc = await karyawanRef.get();

        if (!karyawanDoc.exists) {
            return res.status(404).json({ message: 'Karyawan not found' });
        }

        await projectRef.update({
            members: admin.firestore.FieldValue.arrayUnion(karyawanId)
        });

        res.status(200).json({ message: 'Karyawan added to project successfully' });
    } catch (error) {
        console.error('Error adding karyawan to project:', error);
        res.status(500).json({ message: 'Error adding karyawan to project', error: error.message });
    }
};

const editProjectDate = async (req, res) => {
    try {
        const { projectId, startdate, enddate } = req.body;
        const projectRef = db.collection('projects').doc(projectId);
        await projectRef.update({
            startdate: new Date(startdate),
            enddate: new Date(enddate)
        });

        res.status(200).json({ message: 'Project dates updated successfully' });
    } catch (error) {
        console.error('Error updating project dates:', error);
        res.status(500).json({ message: 'Error updating project dates', error: error.message });
    }
};

module.exports = {
    addProject,
    getAllProjects,
    getProjectById,
    getProjectsByKaryawanId,
    getMembersOfProject,
    getActiveProjects,
    addKaryawanToProject,
    editProjectDate
};
