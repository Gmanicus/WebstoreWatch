require('dotenv').config();
const app = require('express')();
const formParser = require('express-formidable');
const axios = require('axios');
const formData = require('form-data')
const HTMLParser = require('node-html-parser');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const e = require('express');
const Mailgun = require('mailgun.js');
const mg = new Mailgun(formData);
const mailer = mg.client({username: 'api', key: process.env.MAILGUN_API_KEY});
const fs = require("fs");
const escaper = require('mongo-escape').escape

app.use(formParser());
app.use(cors())

const uri = `mongodb+srv://dbuser:${process.env.DB_PASS}${process.env.DB_URL_END}`;
const mongo = new MongoClient(uri);
var watchers;
var extensions;
var mailTemplate;

async function startServer() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        console.log("Connecting to the database...");
        await mongo.connect();
        // Establish and verify connection
        console.log("Verifying database connection...");
        await mongo.db("WebstoreWatch").command({ ping: 1 });
        console.log("Successfully connected to the database");

        let database = mongo.db("WebstoreWatch");

        watchers = database.collection("watch");
        extensions = database.collection("extension");

        // Get HTML template
        fs.readFile('./email-template.html', function (err, html) {
            if (err) {
                throw err; 
            } else {
                console.log("Got mail html template")
                mailTemplate = HTMLParser.parse(html).querySelector("body").toString();
            }
        })

        // Check extensions every 10 minutes
        // setInterval(await CheckAndAlert, 60000 * 10)
        CheckAndAlert();

        app.listen(8080, () => { console.log("Server started on port 8080")});

    } catch (err) {
        console.error(err);
        // Ensures that the client will close when you finish/error
        await mongo.close();
    }
}



// ☼ HELPER FUNCTIONS

function mapIDs(idArray) {
    return idArray.map(item => item.toString());
}



// ☼ BACKEND

// Get the support requests on the given extension page
async function getSupportData(id) {
    return await axios.post(`http://chromewebstore.google.com/detail/${id}/reviews`)
        .then((res) => {
            let html = HTMLParser.parse(get_res.data);
            let reviews = JSON.parse(html.querySelectorAll("main > div > section"));
            let data = JSON.parse(res.data.substring(6));
            let requests = data[1][1];

            // title i5
            // text i6
            // version i10
            // changeDate i12
            // user i16

            requests = requests.map((item) => {
                console.log('Got item', item)
                return {
                    title: item[5],
                    content: item[6],
                    version: item[10],
                    changeDate: item[12],
                    user: {
                        name: item[16][1],
                        image: item[16][2]
                    }
                }
            })

            return requests;
        })
}

// Get the details of the given extension
async function getExtensionDetails(id) {
    return await axios.post(`http://chromewebstore.google.com/detail/${id}`)
        .then((res) => {
            let data = res.data.substring(6);
            data = JSON.parse(data);
            let itemDetail = data[1];
            let itemMeta = itemDetail[1][0];
            
            let item = {
                name: itemMeta[1],
                summary: itemMeta[6],
                author: itemMeta[2],
                icon: itemMeta[3]
            }

            return item;
        })
}

// Find all extensions with new support requests and alert them
async function CheckAndAlert() {
    console.log("\nChecking for new support tickets across all extensions...");
    let extensionTable = await extensions.find().toArray();
    let updatedExtensions = [];

    for (const ext of extensionTable) {
        let currentSupportDate = ext.latestSupport;
        let extSupportTickets = await getSupportData(ext.ext_id);
        let latestSupportDate = extSupportTickets[0]?.changeDate || 1;

        // console.log(latestSupportDate, currentSupportDate);

        // If this extension has updated, put it aside
        // if (latestSupportDate > currentSupportDate) updatedExtensions.push(ext);
    }

    // Send email updates
    if (updatedExtensions.length > 0) {
        console.log("Some extensions have updated...");
        console.log(updatedExtensions.map(ext => ext.name));

        updatedExtensions.forEach(async ext => {
            // Find all watchers for this extension
            let theseWatchers = await watchers.find({ extensions: ext._id });

            // If there are no watchers, skip
            if (!theseWatchers) return;
            console.log(`[MAIL] Alerting watchers for ${ext.name}`)

            // Send email to watchers
            SendSupportAlert(
                ext.name,
                `https://chrome.google.com/webstore/detail/${ext.ext_id}`,
                await theseWatchers.toArray().then(array => array.map(watcher => watcher.email))
            )
        })

        // Update latest support dates for all updated extensions...
        console.log("Updating latest support dates...");
        extensions.updateMany({ _id: { $in: updatedExtensions.map(ext => ext._id)}}, {
            $set: { latestSupport: Date.now() }
        })
        console.log("Extension support dates updated");
    } else console.log("No updates for any extensions");
}

// Send support alert email to recipients
function SendSupportAlert(extName, extLink, recipients) {
    // Clone the html template and fill it
    htmlMessage = HTMLParser.parse(mailTemplate);
    htmlMessage.getElementById("extension-name").set_content(extName);
    htmlMessage.getElementById("extension-link").setAttribute("href", extLink);
    // htmlMessage.getElementById("unsubscribe").setAttribute("href", `${SERVER_IP}/unwatch`);

    // console.log(`${SERVER_IP}/unwatch`);

    mailer.messages.create(process.env.MAILGUN_DOMAIN, {
        from: "Webstore Watch <example@example.com>",
        to: "Webstore Watch <example@example.com>",
        bcc: recipients,
        subject: `${extName} has received a new support request`,
        text: `Hi there,\n\n${extName} has received a new support request on the Chrome Web Store.\n\nView\n\n\n\nThis is an automated email sent by Webstore Watch. Your email is subscribed to alerts for this extension.`,
        html: htmlMessage.toString()
    })
    .then(msg => console.log(msg.message)) // logs response data
    .catch(err => console.error(err)); // logs any error
}

function SendNewSignup(extName, recipient) {
    mailer.messages.create(process.env.MAILGUN_DOMAIN, {
        from: "Webstore Watch <example@example.com>",
        to: recipient,
        subject: `Subscribed to ${extName} support alerts`,
        text: `Hi there,\n\nYour email has been subscribed to support updates for ${extName} on the Chrome Web Store.\n\n\n\nThanks for using Webstore Watcher.`,
    })
    .then(msg => console.log(msg.message)) // logs response data
    .catch(err => console.error(err)); // logs any error
}



// ☼ API

app.post("/extension", async (request, res) => {
    console.log("Received request", request.fields);

    let ext_id = escaper(request.fields['ext-id']);

    let extension = false;
    try { extension = await getExtensionDetails(ext_id) }
    catch {}
    
    if (extension) res.send(extension);
    else { res.sendStatus(400); console.log("Bad request!"); }

    // TODO: Handle exception
})

app.post("/watch", async (request, res) => {
    console.log("Received request", request.fields);

    let ext_id = escaper(request.fields['ext-id']);
    let ext_name = escaper(request.fields['ext-name']);
    let email = escaper(request.fields['email']);

    // find if the extension is already in the database
    let existingExtension = await extensions.findOne({ ext_id: ext_id });
    let existingWatcher = await watchers.findOne({ email: email });
    let ext_db_id;
    let result = true;

    // If not found, add it
    if (!existingExtension) {
        let supportChangeDate = getSupportData(ext_id)[0]?.changeDate || Date.now();
        let insertResult = await extensions.insertOne({
            ext_id: ext_id,
            name: ext_name,
            latestSupport: supportChangeDate
        });
        ext_db_id = insertResult.insertedId;
        console.log('[DATABASE] Inserted extension', ext_name);
    } else {
        ext_db_id = existingExtension._id;
        console.log('[DATABASE] Found existing extension', ext_name);
    }

    // if this watcher is not already watching this extension
    if (!existingWatcher) {
        await watchers.insertOne({
            email: email,
            extensions: [ext_db_id]
        })

        console.log('[DATABASE] Inserted watcher');
    } else {
        console.log('[DATABASE] Found existing watcher');

        // If this email is already subscribed to this extension
        if (mapIDs(existingWatcher.extensions).includes(ext_db_id.toString())) {
            result = false;
            console.log('Already subscribed to this extension!', ext_name);
        } else {
            // Append new id to watcher extension list
            watchers.updateOne({ _id: existingWatcher._id }, {
                $set: {
                    extensions: [...existingWatcher.extensions, ext_db_id]
                }
            })

            console.log('[DATABASE] Subscribed existing watcher to extension', ext_name);
        }
    }

    // respond
    if (result) {
        res.send("Subscribed!");
        SendNewSignup(ext_name, email);
    } else {
        res.status(418);
        res.send("That email is already subscribed to this extension!");
    }
})



startServer();