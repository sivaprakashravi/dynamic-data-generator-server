var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";
var express = require('express');
var isoDate = require('isodate');
var app = express();
var bodyParser = require('body-parser');
var moment = require('moment');
var crypto = require("crypto");
var cors=require('cors');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cors({origin:true,credentials: true}));
var port = process.env.PORT || 8083; // set our port

var dbname = "dynamic-dev";
// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();
router.get('/loader', function(req, res) {
    console.log(req.query);
    var id = (req.query.id).toString();
    MongoClient.connect(url, {
        useNewUrlParser: true
    }, function(err, db) {
        if (err) throw err;
        var dbo = db.db(dbname);
        dbo.collection(id).find({}, {projection:{ _id: 0 }})

            .toArray(
                function(err,
                    result) {
                    var iObj = {};
                    iObj.id = id;
                    iObj.data = result;
                    if (err)
                        throw err;
                    res.send(iObj);
                    db.close();
                });
    });

});
var arrayLength = 0;
router.post('/generate', function(req, resp) {
    var body = req.body;
    var bodyP;
    arrayLength = 0;
    if (body.type === 'Array') {
        bodyP = [];
        for (var i = 0; i < body.length; i++) {
            bodyP.push(processList(body));
        }
    } else {
        bodyP = processList(body);
    }
    var processedList = bodyP;
    // console.log(processedList);
    var id = crypto.randomBytes(20).toString('hex');
    MongoClient.connect(url, {
        useNewUrlParser: true
    }, function(err, db) {
        if (err) throw err;
        var dbo = db.db(dbname);
        dbo.createCollection(id, function(err, res) {
            if (err) throw err;
            console.log("Collection created!");
            var genObj = {};
            genObj.id = id;
            genObj.createdDate = new Date();
            genObj.length = processedList.length;
            dbo.collection('gen').insertOne(genObj, function(err, r) {
                        if (err) throw err;
                        if (r && r.insertedCount) {
                            
            if (body.type === 'Array') {
                dbo.collection(id).insertMany(
                    processedList,
                    function(err, r) {
                        if (err) throw err;
                        if (r && r.insertedCount) {
                            responseManager(id,
                                resp,
                                dbo, db);
                        }
                    });
            } else {
                dbo.collection(id).insertOne(
                    processedList,
                    function(err, r) {
                        if (err) throw err;
                        if (r && r.insertedCount) {
                            responseManager(id,
                                resp,
                                dbo, db);
                        }
                    });

            }
                        }
                    });
        });
    });
});

console.log('Server Running on --> ' + port);
app.use('/', router);
app.listen(port);

function responseManager(id, resp, dbo, db) {
    dbo.collection(id).find({}, {projection:{ _id: 0 }})
        .toArray(
            function(err,
                result) {
                var iObj = {};
                iObj.id = id;
                iObj.data = result;
                if (err)
                    throw err;
                resp.send(iObj);
                db.close();
            });
}

function randomString() {
    var chars =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 8;
    var randomstring = '';
    for (var i = 0; i < string_length; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}

function processList(body) {
    var superObject = {};
    if (body && body.list) {
        (body.list).forEach(function(obj) {
            arrayLength++;
            if (arrayLength > 10000) return;
            console.log(arrayLength++);
            var objectName = obj.objectName;
            var type = obj.type;
            var value = obj.value;
            var length = obj.length;
            if (obj && type) {
                if (type === 'boolean') {
                    if (value && value != 'Random') {
                        superObject[objectName] = (value ==
                            'true');
                    } else {
                        superObject[objectName] = Math.random() >=
                            0.5;
                    }
                }
                if (type === 'name') {
                    superObject[objectName] = value ? value :
                        randomString();
                }
                if (type === 'number') {
                    superObject[objectName] = value ? value : Math.floor(
                        (Math.random() * 1000000) + 1);
                }
                if (type === 'null') {
                    superObject[objectName] = null;
                }
                if (type === 'string') {
                    superObject[objectName] = randomString();
                }
                if (type === 'object') {
                    superObject[objectName] = processList(
                        obj.list);
                }
                if (type === 'array') {
                    var newArr = [];
                    for (var i = 0; i < length; i++) {
                        newArr.push(processList(obj));
                    }
                    superObject[objectName] = newArr;
                }
            }
        });
    }
    return superObject;
}