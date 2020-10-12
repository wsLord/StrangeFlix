const register = require('express').Router();

var validator = require("email-validator");
var crypto = require('crypto');
var nodemailer = require('nodemailer');
var bcrypt = require("bcrypt");
const { getMaxListeners } = require('process');

const usertoken = require('../schemas/token');
const userdata = require('../schemas/userData');

require('dotenv').config();

register.get('/', (req, res) => {
	if (req.session.user_id) {
		res.render('Flexing.ejs');
	}
	else {
		res.render('register.ejs', {
			"error": "",
			"message": ""
		});
	}
})

register.post('/', (req, res) => {
	var fname = req.body.fName;
	var lname = req.body.lName;
	var Email = req.body.email;
	var password = req.body.password;
	if (fname == "" || lname == "" || Email == "" || password == "") {
		res.render('register.ejs', {
			"error": "Fill all the fields below",
			"message": ""
		});
		return;
	}
	if (validator.validate(Email) == false) {
		res.render('register.ejs', {
		"error": "Email is invalid",
		"message": ""
		});
		return;
	}

	userdata.findOne({ email: Email }, (err, data) => {
		if (err)
			console.log(err);
		else if (data != null) {
			res.render('register.ejs', {
				"error": 'The email address you have entered is already associated with another account.',
				"message": ""
			});
		}
		else {
			//Saving Data
			bcrypt.hash(password, 10, (err, hash) => {
				if (err) {
					console.log(err);
					return;
				}
				// Now we can store the password hash in db.
				var data = { fName: fname, lName: lname, email: Email, password: hash };
				var mydata = new userdata(data);
				mydata.save(function (err) {
					if (err)
						return console.error(err);
				})

				//Mail Verification
				var token = new usertoken({ _userId: mydata._id, token: crypto.randomBytes(16).toString('hex') });

				// Save the verification token
				token.save(function (err) {
					if (err)
						return console.error(err);
				});

				// Send the email
				var transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.TOKEN_MAIL, pass: process.env.TOKEN_PASS } });
				var mailOptions = {
					from: process.env.TOKEN_MAIL,
					to: Email,
					subject: 'Account Verification Token',
					text: 'Hey ' + data.fName + ',\n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/confirmation\/' + token.token + '\n\nThe link is valid for next 5 minutes only.\n\nRegards,\nStrangeFlix\n\nKeep Flixing! :)'
				};
				transporter.sendMail(mailOptions, function (err) {
					if (err) {
						console.error(err);
						res.render('register.ejs', {
							"error": "Check your Email-ID",
							"message": ""
						});
					}
					res.render('register.ejs', {
						"error": "",
						"message": "A verification email has been sent."
					});
				});
			});
		}
	});
});

module.exports = register;