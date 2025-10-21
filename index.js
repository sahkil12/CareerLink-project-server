const express = require('express');
const cors = require('cors');
const app = express()
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
// middleware
app.use(cors())
app.use(express.json())
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
    app.get('/jobs', async (req, res)=>{
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
    app.get('/applications', async (req, res)=>{
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

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir); 


app.get('/', (req, res)=>{
    res.send('CareerLink is Start')
})

app.listen(port, ()=>{
    console.log(`CareerLink is running on ${port}`);
})