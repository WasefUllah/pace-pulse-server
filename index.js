require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

var admin = require("firebase-admin");

var serviceAccount = require("./pace-pulse-firebase-adminsdk-fbsvc-f59383894c.json");

const port = process.env.PORT || 3000;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const serverUrl = "https://pace-pulse-server.vercel.app";
const clientUrl = "https://pace-pulse.web.app";
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false; //true for live, false for sandbox

// middleware
app.use(cors());
app.use(
  cors({
    origin: ["https://pace-pulse.web.app"],
    credentials: true,
  })
);
app.use(express.json());

// custom middleware
const verifyAccessToken = async (req, res, next) => {
  const token = req.headers.authorization.split("Bearer ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;

    next();
  } catch (error) {
    console.log(error);

    res.status(401).send({ message: "unauthorized access" });
  }
};

const verifyAccessEmail = async (req, res, next) => {
  if (req.query.email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const SSLCommerzPayment = require("sslcommerz-lts");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vpmsoqw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("pace-pulse");
    const marathonCollection = database.collection("marathons");
    const registrationCollection = database.collection("registration");

    // POST APIs

    app.post("/marathon", async (req, res) => {
      const marathon = req.body;
      const result = await marathonCollection.insertOne(marathon);
      res.send(result);
    });

    app.post("/registrations", async (req, res) => {
      const registration = req.body;
      const marathon = await marathonCollection.findOne({
        _id: new ObjectId(registration.marathonId),
      });
      const name = registration.firstName + " " + registration.lastName;
      const tran_id = new ObjectId().toString();
      const pendingRegistration = {
        ...registration,
        name,
        tran_id,
        status: "pending",
      };
      const result = await registrationCollection.insertOne(
        pendingRegistration
      );
      // console.log("Saved pending registration:", result.insertedId);

      const data = {
        total_amount: registration?.fee,
        currency: "BDT",
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `${serverUrl}/success/${tran_id}`,
        fail_url: `${serverUrl}/failed`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: marathon.title,
        product_category: "Electronic",
        product_profile: "general",
        cus_name: name,
        cus_email: registration.userEmail,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: registration.contactNumber,
        cus_fax: registration.contactNumber,
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        console.log("Redirecting to: ", GatewayPageURL);
      });
    });

    app.post("/success/:tranId", async (req, res) => {
      const tranId = req.params.tranId;

      const result = await registrationCollection.updateOne(
        { tran_id: tranId },
        { $set: { status: "paid" } }
      );

      if (result.modifiedCount > 0) {
        // res.send(result);
        console.log(`Transaction ${tranId} marked as paid`);
        const registration = await registrationCollection.findOne({
          tran_id: tranId,
        });
        console.log(registration);
        const result = await marathonCollection.updateOne(
          { _id: new ObjectId(registration.marathonId) },
          { $inc: { regCount: 1 } }
        );

        res.redirect(`${clientUrl}/success/${tranId}`);
      } else {
        res.redirect(`${clientUrl}/failed`);
      }
    });

    app.post("/failed", (req, res) => {
      res.redirect(`${clientUrl}/failed`);
    });

    // GET APIs

    app.get("/featuredmarathon", async (req, res) => {
      const marathons = await marathonCollection
        .aggregate([{ $sample: { size: 6 } }])
        .toArray();
      res.send(marathons);
    });

    app.get("/upcomingmarathon", async (req, res) => {
      const now = new Date();

      const marathons = await marathonCollection
        .aggregate([
          {
            $match: {
              $expr: {
                $gt: [{ $toDate: "$endRegDate" }, now],
              },
            },
          },
          {
            $sample: { size: 6 },
          },
        ])
        .toArray();

      res.send(marathons);
    });

    app.get(
      "/allmarathons",
      verifyAccessToken,
      verifyAccessEmail,
      async (req, res) => {
        let query = {};

        if (req.query.email) {
          query = {
            createdBy: req.query.email,
          };
        }
        const result = await marathonCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.get("/allmarathonswithoutemail", async (req, res) => {
      if (req.query.sortOption == "registration") {
        const result = await marathonCollection
          .find()
          .sort({ startRegDate: 1 })
          .toArray();
        res.send(result);
      } else if (req.query.sortOption == "marathon") {
        const result = await marathonCollection
          .find()
          .sort({ marathonStartDate: 1 })
          .toArray();
        res.send(result);
      } else {
        const result = await marathonCollection
          .find()

          .toArray();
        res.send(result);
      }
    });

    app.get("/registrations/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await registrationCollection.findOne(query);
      res.send(result);
    });

    app.get(
      "/applied",
      verifyAccessToken,
      verifyAccessEmail,
      async (req, res) => {
        const email = req.query.email;
        const query = {
          userEmail: email,
          status: "paid",
        };
        const result = await registrationCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.get("/marathons/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await marathonCollection.findOne(query);
      res.send(result);
    });

    app.get(
      "/aggregate",
      verifyAccessToken,
      verifyAccessEmail,
      async (req, res) => {
        const email = req.query.email;
        const query = {
          userEmail: email,
          status: "paid",
        };
        const result = await registrationCollection.find(query).toArray();
        const marathonIds = result.map((reg) => reg.marathonId);
        const marathons = [];
        for (let index = 0; index < marathonIds.length; index++) {
          const query = {
            _id: new ObjectId(marathonIds[index]),
          };
          const single = await marathonCollection.findOne(query);
          if (single) {
            marathons.push(single);
          }
        }
        res.send(marathons);
      }
    );

    // PUT APIs

    app.put("/marathon/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedMarathon = req.body;
      const updatedDoc = {
        $set: updatedMarathon,
      };
      const result = await marathonCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });
    app.put("/registrations/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedRegistration = req.body;
      const updatedDoc = {
        $set: updatedRegistration,
      };
      const result = await registrationCollection.updateOne(
        filter,
        updatedDoc,
        option
      );
      res.send(result);
    });

    // PATCH APIs

    app.patch("/marathon/increment/:id", async (req, res) => {
      const id = req.params.id;
      const result = await marathonCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { regCount: 1 } }
      );
      res.send(result);
    });
    app.patch("/marathon/decrement/:id", async (req, res) => {
      const id = req.params.id;
      const result = await marathonCollection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { regCount: -1 } }
      );
      res.send(result);
    });

    // DELETE APIs
    app.delete("/allmarathons/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await marathonCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/registrations/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await registrationCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
