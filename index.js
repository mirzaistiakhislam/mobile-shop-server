const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iipillt.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {

    try {
        const categoriesCollection = client.db('phoneBuyAndSell').collection('categories');
        const productsCollection = client.db('phoneBuyAndSell').collection('products');
        const bookingsCollection = client.db('phoneBuyAndSell').collection('bookings');
        const usersCollection = client.db('phoneBuyAndSell').collection('users');

        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollection.find(query).toArray();
            res.send(categories);
        });


        // app.get('/products/:id', async (req, res) => {
        //     const id = req.params.id;
        //     let query = { product_id: id };
        //     const products = await productsCollection.find(query).toArray();
        //     res.send(products);
        app.get('/categoryproducts/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            let query = { categoryId: id, salesStatus: 'Available' };
            const products = await productsCollection.find(query).toArray();
            res.send(products);
        });

        //bookings load on dashboard
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        })


        //bookings data save into mongodb
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = { email: booking?.email, productId: booking?.productId }
            const found = await bookingsCollection.findOne(query);
            if (found) {
                res.send({ status: 'Already Booked!' })
            } else {
                const result = await bookingsCollection.insertOne(booking);
                res.send(result);
            }
        });

        //users data
        app.post('/adduser', async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { email: user?.email }
            const found = await usersCollection.findOne(query)
            if (!found) {
                const result = await usersCollection.insertOne(user);
                console.log(result);
                res.send(result);
            }
        })
        app.post('/addproduct', async (req, res) => {
            const data = req.body;
            const result = await productsCollection.insertOne(data);
            res.send(result);

        })

        app.get('/usertypecheck/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const found = await usersCollection.findOne(query)
            res.send(found)
        })

        app.get('/myproducts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { authorEmail: email };
            const products = await productsCollection.find(query).toArray()
            res.send(products)
        })
        app.delete('/deleteproduct', async (req, res) => {
            const id = req.body.id;
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })
        app.put('/makeadvertise', async (req, res) => {
            const id = req.body.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertise: 'Yes'
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })
    }
    finally {

    }

}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('server is running');
})

app.listen(port, () => console.log(`running on ${port}`));