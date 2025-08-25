var express = require("express");
var mysql2 = require("mysql2");
var cloudinary = require("cloudinary").v2;
var fileuploader = require("express-fileupload");
// *************AI connection************************
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyAf-eWFsE9qrMElrIjxqGwYi8jrRGn7GHE");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

var app = express();
app.use(fileuploader());
app.use(express.static("public"))//to use photo
app.listen(2005, function () {
    console.log("✅ Server Started at Port no: 2005");
})

app.get("/", function (req, resp) {
    let path = __dirname + "/public/index.html";
    resp.sendFile(path);
});

//======================================== 
app.use(express.urlencoded(true));///convert POST data to JSON object

cloudinary.config({
    cloud_name: 'drinqory4',
    api_key: '764946575852276',
    api_secret: '8ildnWRRyZ43m6bk5aYMDVHvDck' // Click 'View API Keys' above to copy your API secret
});
// =========================================
// let dbConfig = "mysql://avnadmin:AVNS_Ku-R28NvnxLE3b3Sdd4@mysql-2f418e9-rishikagoyal53-c65f.c.aivencloud.com:17511/defaultdb"//for connectivity with aiven
// let mySqlVen = mysql2.createConnection(dbConfig);
// mySqlVen.connect(function (errKuch) {
//     if (errKuch == null)
//         console.log("Aiven Connected Successfullyyy!!!");
//     else
//         console.log(errKuch.message);
// })
const mysql = require("mysql2");

let mySqlVen = mysql.createPool({
    uri: "mysql://avnadmin:AVNS_Ku-R28NvnxLE3b3Sdd4@mysql-2f418e9-rishikagoyal53-c65f.c.aivencloud.com:17511/defaultdb",
    waitForConnections: true,
    connectionLimit: 10,   // max simultaneous connections
    queueLimit: 0
});

console.log("✅ Aiven Pool Created Successfully!");

// // -----------------Gemini-AI--------------------
app.get("/ai", function (req, resp) {

    // resp.sendFile();
    let dirName = __dirname;//Global Variable for path of current directory
    //let filename=__filename;
    //resp.send(dirName+"  <br>     "+filename);
    let fullpath = dirName + "/public/frontAi.html";
    resp.sendFile(fullpath);
})
// ***********signup***************************
app.get("/do-signup", function (req, resp) {


    let emailid = req.query.txtEmail; //column name aur yeh variable same hi krlo
    let pwd = req.query.txtPwd;
    let usertype = req.query.userType;

    mySqlVen.query("insert into users values(?,?,?,current_date( ),1)", [emailid, pwd, usertype], function (errKuch) {
        if (errKuch == null)
            resp.send("Record Saved Successfullyy....");
        else
            resp.send(errKuch.message);
    })

})

// ************login*****************
app.get("/do-login", function (req, resp) {
    let emailid = req.query.loginemail;
    let password = req.query.loginpwd;
    console.log("Login attempt with:", emailid, password);
    let query = "SELECT * FROM users WHERE emailid = ? AND password = ?";

    mySqlVen.query(query, [emailid, password], function (err, allRecords) {

        //*************
        if (err) {
            console.log("SQL Error:", err.message);
            resp.send("Database error: " + err.message);
            return;
        }
        //*********** */
        if (allRecords.length == 0) {
            resp.send("Invalid");
        }
        else if (allRecords[0].status == 1) {
            resp.send(allRecords[0].usertype);
        }
        else
            resp.send("Blocked");
    });

});

// ***********************Login modal pwd change************************************
app.get("/do-change-password", function (req, resp) {
    let emailid = req.query.loginemail;
    let oldpass = req.query.oldpass;
    let newpass = req.query.newpass;

    let updateQuery = "UPDATE users SET password=? WHERE emailid=? AND password=? AND usertype='player'";
    mySqlVen.query(updateQuery, [newpass, emailid, oldpass], function (errKuch, result) {
        if (errKuch) {
            console.log(errKuch);
            resp.send("Something Went Wrong.Try Again Later")
        } else if (result.affectedRows == 0) {
            resp.send("Wrong emaild or pwd");
        } else
            resp.send("Password Updated Successfully");
    })
});
// **************org-details*********************
app.post("/org-signup", async function (req, resp) {
    let picurl = "";
    if (req.files != null) {
        let fName = req.files.orgpic.name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        req.files.orgpic.mv(fullPath);
        await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) { //copied
            picurl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server

            console.log(picurl);
        });
    }
    else {
        picurl = "nopic.jpg";
    }

    let emailid = req.body.orgEmail;
    let orgname = req.body.orgname;
    let regnumber = req.body.orgnumber;
    let address = req.body.orgaddress;
    let city = req.body.orgcity;
    let sports = req.body.orgdeals;
    let website = req.body.orgwebsite;
    let insta = req.body.orginsta;
    let head = req.body.orghead;
    let contact = req.body.orgcontact;
    let otherinfo = req.body.orgother;

    mySqlVen.query("insert into organizers values(?,?,?,?,?,?,?,?,?,?,?,?)", [emailid, orgname, regnumber, address, city, sports, website, insta, head, contact, picurl, otherinfo], function (errKuch) {
        if (errKuch == null)
            resp.send("Record Saved Successfullyy....Badhai");
        else
            resp.send(errKuch.message);
    })
})

// **********************Search******************************
app.get("/get-one", function (req, resp) {
    mySqlVen.query("select * from organizers where emailid=?", [req.query.orgEmail], function (err, allRecords) {
        if (allRecords.length == 0)
            resp.send("No Record Found");
        else
            resp.json(allRecords);
    })
})

// ******************Update User*****************************
app.post("/update-user", async function (req, resp) {
    let picurl = "";  //copy pasted and pic wala kaam to itna hi h
    if (req.files != null) //agar null nhi h to mtlb user wants to update the profile pic
    {
        let fName = req.files.profilePic.name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        req.files.profilePic.mv(fullPath);

        await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) { //copied
            picurl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server

            console.log(picurl);
        });
    }
    else
        picurl = req.body.hdn;

    // req.body.picname = fileName;

    let emailid = req.body.orgEmail; //column name aur yeh variable same hi krlo
    let orgname = req.body.orgname;
    let regnumber = req.body.orgnumber;
    let address = req.body.orgaddress;
    let city = req.body.orgcity;
    let sports = req.body.orgdeals;
    let website = req.body.orgwebsite;
    let insta = req.body.orginsta;
    let head = req.body.orghead;
    let contact = req.body.orgcontact;
    let otherinfo = req.body.orgother;


    mySqlVen.query("update organizers set orgname=?,regnumber=?,address=?,city=?,sports=?,website=?,insta=?,head=?,contact=?,picurl=?,otherinfo=? where emailid=?", [orgname, regnumber, address, city, sports, website, insta, head, contact, picurl, otherinfo, emailid], function (errKuch, result) {
        if (errKuch == null) {
            if (result.affectedRows == 1)
                resp.send("Record Saved Successfullyy....Badhai");
            else
                resp.send("Invalid email Id");
        }

        else
            resp.send(errKuch.message);
    })
})

// ****************post-tournament************************************
app.get("/post-event", function (req, resp) {
    let email = req.query.postEmail;
    let event = req.query.postTitle;
    let doe = req.query.postDate;
    let toe = req.query.postTime;
    let address = req.query.postAddress;
    let city = req.query.postCity;
    let sports = req.query.postCategory;
    let minage = req.query.postMinA;
    let maxage = req.query.postMaxA;
    let lastdate = req.query.postLastDate;
    let fee = req.query.postFee;
    let prize = req.query.postPrize;
    let contact = req.query.postContact;

    mySqlVen.query("insert into tournaments values (?,?,?,?,?,?,?,?,?,?,?,?,?,? )", [null, email, event, doe, toe, address, city, sports, minage, maxage, lastdate, fee, prize, contact],
        function (errKuch) {
            if (errKuch == null)
                resp.send("Record Saved Successfulllyyy....Badhai");
            else
                resp.send(errKuch.message)
        }
    )

})

// ******************Angular Data Fetch (tournaments manager)*****************************************

app.get("/do-fetch-tournaments", function (req, resp) {
    mySqlVen.query("select * from tournaments", function (err, allRecords) {
        console.log(req.query);
        resp.send(allRecords); //aise error pta lga skte h(localhost:2004/do-fetch-all-users)
    })
})

// ----------------------Angular Delete-------------------------------
app.get("/delete-tournament", function (req, resp) {
    console.log(req.query);
    let rid = req.query.ridKuch; //emailidkuch must be similar to given url in script

    mySqlVen.query("Delete from tournaments where rid=?", [rid], function (errKuch, result) {
        if (errKuch == null) {
            if (result.affectedRows == 1)
                resp.send("Deleted Succcessfullyyyy...");
            else
                resp.send("Invalid Email Id");
        } else
            resp.send(errKuch);
    })
})

// **********************AI connection******************************

async function RajeshBansalKaChirag(imgurl) {
    const myprompt = "Read the text on picture and tell all the information in adhaar card and give output STRICTLY in JSON format { namee:'', gender:''}. Dont give output as string."
    const imageResp = await fetch(imgurl)
        .then((response) => response.arrayBuffer());

    const result = await model.generateContent([
        {
            inlineData: {
                data: Buffer.from(imageResp).toString("base64"),
                mimeType: "image/jpeg",
            },
        },
        myprompt,
    ]);
    const responseText = await result.response.text();
    console.log(result.response.text())

    const cleaned = responseText.replace(/```json|```|json/gi, '').trim();
    const jsonData = JSON.parse(cleaned);
    console.log(jsonData);

    return jsonData

}


// -----------------------profile-player (adhar card ai)---------------------------------
app.post("/profile-player", async function (req, resp) {
    try {
        let acardpicurl = "";
        let jsonData = {};

        if (req.files != null) {
            let fName = req.files.playerAdhar.name;
            let fullPath = __dirname + "/public/uploads/" + fName;
            await req.files.playerAdhar.mv(fullPath);

            const picUrlResult = await cloudinary.uploader.upload(fullPath); //copied
            acardpicurl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server
            console.log(acardpicurl);

            jsonData = await RajeshBansalKaChirag(acardpicurl);
            console.log(jsonData);

        }
        else {
            acardpicurl = "nopic.jpg";
        }

        // second pic data
        let profilepicurl = "";
        if (req.files != null) {
            let fName = req.files.playerPic.name;
            let fullPath = __dirname + "/public/uploads/" + fName;
            await req.files.playerPic.mv(fullPath);
            await cloudinary.uploader.upload(fullPath).then(function (picUrlResult) { //copied
                profilepicurl = picUrlResult.url;   //will give u the url of ur pic on cloudinary server
                console.log(profilepicurl);
            });

        }
        else {
            profilepicurl = "nopic.jpg";
        }


        let emailid = req.body.playerEmail;
        // let namee = req.body.playerName;
        // let gender = req.body.playerGender;
        let address = req.body.playerAddress;
        let contact = req.body.playerContact;
        let game = req.body.playerGame;
        let otherinfo = req.body.playerOther;

        mySqlVen.query("insert into players values(?,?,?,?,?,?,?,?,?)", [emailid, acardpicurl, profilepicurl, jsonData.namee || null, jsonData.gender || null, address, contact, game, otherinfo], function (errKuch) {
            if (errKuch == null)
                resp.send("Record Saved Successfullyy....Badhai");
            else
                resp.send(errKuch.message);
        }
        );
    }
    catch (err) {
        console.error(err);
        resp.send(err.message)
    }
});


// **********************Search Player******************************
app.get("/fetch-player-details", function (req, resp) {
    mySqlVen.query("select * from players where emailid=?", [req.query.orgEmail], function (err, allRecords) {
        if (allRecords.length == 0)
            resp.send("No Record Found");
        else
            resp.json(allRecords);
    })
})

// ******************Update User*****************************
app.post("/update-player", async function (req, resp) {
    console.log();

    let acardpicurl = "";
    let profilepicurl = "";  //copy pasted and pic wala kaam to itna hi h
    if (req.files != null) //agar null nhi h to mtlb user wants to update the profile pic
    {
        let fName = req.files.playerAdhar.name;
        let fName2 = req.files.playerPic.name;
        let fullPath = __dirname + "/public/uploads/" + fName;
        let fullPath2 = __dirname + "/public/uploads/" + fName2;
        req.files.playerAdhar.mv(fullPath);
        req.files.playerPic.mv(fullPath2);

        acardpicurl = (await cloudinary.uploader.upload(fullPath)).url;
        profilepicurl = (await cloudinary.uploader.upload(fullPath2)).url;
    }
    else
        picurl = req.body.hdn;

    // req.body.picname = fileName;

    let emailid = req.body.playerEmail;
    let namee = req.body.playerName;
    let dob = req.body.playerDate;
    let gender = req.body.playerGender;
    let address = req.body.playerAddress;
    let contact = req.body.playerContact;
    let game = req.body.playerGame;
    let otherinfo = req.body.playerOther;


    mySqlVen.query("update players set acardpicurl=?,profilepicurl=?,namee=?,dob=?,gender=?,address=?,contact=?,game=?,otherinfo=? where emailid=?", [acardpicurl, profilepicurl, namee, dob, gender, address, contact, game, otherinfo, emailid], function (errKuch, result) {
        if (errKuch == null) {
            if (result.affectedRows == 1)
                resp.send("Record Saved Successfullyy....Badhai");
            else
                resp.send("Invalid email Id");
        }

        else
            resp.send(err.message);
    })
})

// -----------------Admin-user-console-----------------------------
app.get("/do-fetch", function (req, resp) {
    mySqlVen.query("select * from users", function (err, allRecords) {
        console.log(req.query);
        resp.send(allRecords); //aise error pta lga skte h(localhost:2004/do-fetch-all-users)
    })
})

// -------------------------- Block User ----------------------------
app.get("/do-block", function (req, resp) {
    let emailid = req.query.emailid;

    mySqlVen.query("UPDATE users SET status = 0 WHERE emailid = ?", [emailid], function (err, result) {
        if (err == null) {
            if (result.affectedRows == 1)
                resp.send("Blocked..");
            else
                resp.send("Invalid Email id");
        } else {
            resp.send(err.message);
        }
    });
});

// -------------------------- Unblock User --------------------------
app.get("/do-unblock", function (req, resp) {
    let emailid = req.query.emailid;

    mySqlVen.query("UPDATE users SET status = 1 WHERE emailid = ?", [emailid], function (err, result) {
        if (err == null) {
            if (result.affectedRows == 1)
                resp.send("unBlocked..");
            else
                resp.send("Invalid Email id");
        } else {
            resp.send(err.message);
        }
    });
});

// ---------------tournament finder--------------------
app.get("/do-fetch-all-tournaments", function (req, resp) {
    console.log(req.query)
    mySqlVen.query("select * from tournaments where city=? and sports=?", [req.query.kuchCity, req.query.kuchGame], function (err, allRecords) {
        console.log(allRecords)
        resp.send(allRecords);
    })
})


app.get("/do-fetch-all-cities", function (req, resp) {
    mySqlVen.query("select distinct city from tournaments", function (err, allRecords) {
        resp.send(allRecords); //all records mein cities aa jayegi
    })
})



// ******************Angular Data Fetch (Admin Players)*****************************************

app.get("/do-fetch-players", function (req, resp) {
    mySqlVen.query("select * from players", function (err, allRecords) {
        console.log(req.query);
        resp.send(allRecords); //aise error pta lga skte h(localhost:2004/do-fetch-all-users)
    })
})

// --------------------(Admin Organizers)------------------------------------------
app.get("/do-fetch-organizers", function (req, resp) {
    mySqlVen.query("SELECT * FROM organizers", function (err, allRecords) {
        if (err)
            resp.send(err.message);
        else
            resp.send(allRecords);
    });
});

