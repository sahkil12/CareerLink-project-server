const express = require('express');
const cors = require('cors');
const app = express()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
// middleware
app.use(cors())
app.use(express.json())

const admin = require("firebase-admin");
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8')
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const verifyFireBaseToken = async(req, res, next)=>{

  const authHeader = req?.headers?.authorization;
  if(!authHeader || !authHeader.startsWith("Bearer ")){
    return res.status(401).send({message: 'unauthorized access'})
  }
  const token = authHeader.split(' ')[1]
  try{
    const decoded = await admin.auth().verifyIdToken(token)
    req.decoded = decoded
    next()
  }
  catch(error){
     return res.status(401).send({message: 'unauthorized access'})
  }
}

const verifyTokenEmail =(req, res, next)=>{
  if(req.query.email !== req.decoded.email){
     return res.status(403).send({message : 'forbidden access'})
  }
  next()
}

// mongodb connection--
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gr8kgxz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri)

async function run() {
  try {
    await client.connect();
    // jobs data collection in database 
    const jobsCollection = client.db("careerLink").collection("jobs")
    const applyCollection = client.db("careerLink").collection("applicant")
    // jobs api
    // Get all jobs (public)
    app.get('/jobs', async (req, res) => {
    const cursor = jobsCollection.find({});
    const result = await cursor.toArray();
    res.send(result);
    });

    app.get('/myPostedJobs', verifyFireBaseToken, verifyTokenEmail, async (req, res)=>{
        const email = req.query.email
        const query = {}
        if(email){
          query.hr_email = email
        }
        const cursor = jobsCollection.find(query);
        const result = await cursor.toArray()
        res.send(result)
    })
    // add jobs 
    app.post('/jobs', async(req, res)=>{
      const newJobs = req.body;
      const result = await jobsCollection.insertOne(newJobs)
      res.send(result) 
    })

    // get job single data 
    app.get(`/jobs/:id`, async (req, res)=>{
        const id = req.params.id
        const query = {_id : new ObjectId(id)}
        const result = await jobsCollection.findOne(query)
        res.send(result)
    })
    // find some job data for feature card with limit function
    app.get('/featuredJob', async (req, res)=>{
      const jobs = jobsCollection.find().limit(8)
      const result = await jobs.toArray()
      res.send(result)
    })
    
    // applicant data post 
    app.post('/application', async (req, res)=>{
      const application = req.body;
      const result = await applyCollection.insertOne(application)
      res.send(result)
    })
    // get apply data
    app.get('/application', async (req, res)=>{
      // const application = req.body;
      const query = applyCollection.find()
      const result = await query.toArray()
      res.send(result)
    })
    // my application data -
    app.get('/applications', verifyFireBaseToken, verifyTokenEmail, async (req, res)=>{
      const email = req.query.email;
      const query = {email : email}
      const result = await applyCollection.find(query).toArray()
      // optional
      for(const application of result){
        const jobId = application.jobId;
        const jobQuery = {_id: new ObjectId(jobId)}
        const job = await jobsCollection.findOne(jobQuery);
        application.company = job.company;
        application.title = job.title;
        application.company_logo = job.company_logo
        application.jobType = job.jobType
        application.applicationDeadline = job.applicationDeadline
      }
      res.send(result)
    })
    // find how many applicant in a job with job id
    app.get('/applications/job/:job_id', async (req, res)=>{
      const job_id = req.params.job_id;
      const query = {jobId: job_id}
      const result = await applyCollection.find(query).toArray()
      res.send(result)
    })

    // delete my application
    app.delete(`/applications/:id`, async (req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await applyCollection.deleteOne(query)
      res.send(result)
    })
    // updated application status
    app.patch('/applications/:id', async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set:{
          status: req.body.status
        }
      }
      const result = await applyCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

  }
}
run().catch(console.dir); 

app.get('/', (req, res)=>{
    res.send('CareerLink is Start')
})

app.listen(port, ()=>{
    console.log(`CareerLink is running on ${port}`);
})