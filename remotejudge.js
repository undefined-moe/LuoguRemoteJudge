var request = require('sync-request');
var express = require('express');
var bodyParser = require('body-parser');
var auth = require('./auth')
var app = express();
last = {}
token = {}
const API = "https://www.luogu.org/api";
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/remotejudge/', express.static(__dirname + "/node_modules"));
app.use('/remotejudge/', express.static(__dirname + "/public"));

function login(username, password) {
    token = JSON.parse(request("POST", API + "/OAuth2/accessToken", {
        json: {
            grant_type: 'password',
            client_id: auth.client_id,
            client_secret: auth.client_secret,
            username: username || auth.username,
            password: password || auth.password
        }
    }).body.toString());
    console.log(token);
}
function getProblem(pid) {
    console.log(API + "/problem/detail/" + pid);
    if (auth.username && auth.password) {
        login();
        const t = token.access_token;
        const Authorization = `Bearer ${t}`
        var data = request("GET", API + "/problem/detail/" + pid, {
            headers: {
                'Authorization': Authorization
            }
        });
    } else var data = request("GET", API + "/problem/detail/" + pid);
    detail = JSON.parse(data.body.toString());
    return detail.data;
}
function refreshToken() {
    var res = request("POST", API + '/OAuth2/authorize', {
        json: {
            'refresh_token': token.refresh_token
        }
    })
    global.token_res = res;
    if (res.statusCode === 200) {
        console.log('刷新Token成功')
        token = JSON.parse(JSON.stringify(res.body));
    }
}
/*
  export enum ProblemState {
    'Waiting' = 0,
    'Judging' = 1,
    'Compile Error' = 2,
    'OLE' = 3,
    'MLE' = 4,
    'TLE' = 5,
    'WA' = 6,
    'RE' = 7,
    'Accepted' = 12,
    'Unaccepted' = 14,
    'Hack Success' = 21,
    'Hack Failure' = 22,
    'Hack Skipped' = 23
  }
  */
function submitSolution(id, text, language = 0, enableO2 = false, username, password) {
    login(username, password);
    const t = token.access_token;
    const Authorization = `Bearer ${t}`
    console.log(Authorization);
    var rid = 0;
    try {
        var res = request("POST", API + "/problem/submit/" + id, {
            json: {
                'code': text,
                'lang': language,
                'enableO2': enableO2,
                'verify': ''
            },
            headers: { 'Authorization': Authorization }
        })
        last = res;
        rid = JSON.parse(res.body.toString()).data.rid;
        console.log(rid);
    } catch (e) {
        console.log(e);
    }
    return rid;
}
app.post('/remotejudge/submit', function (req, res) {
    console.log(req.body);
    res.redirect("https://www.luogu.org/recordnew/show/" + submitSolution(req.body.pid, req.body.code, req.body.lang, false, req.body.username, req.body.password))
    //res.json({ rid: submitSolution(req.body.pid, req.body.code, req.body.lang, false, req.body.username, req.body.password) });
})
app.get('/remotejudge/getProblem', function (req, res) {
    console.log(req.body);
    res.json(getProblem(req.body.pid));
})
app.post('/remotejudge/getProblem', function (req, res) {
    console.log(req.body);
    res.json(getProblem(req.body.pid));
})
app.get('/remotejudge/getRemoteResult', function (req, res) {
    if (!req.body.rid) res.json({ code: 400, data: 'ERROR Record ID' });
    else {
        var data = request('GET', 'https://www.luogu.org/recordnew/show/' + req.body.rid);
        //document.getElementsByClassName('lg-record-tile case-tile')
        res.json({ data: data });
    }
})
process.stdin.setEncoding('utf8');
process.stdin.on('data', (input) => {
    input = input.toString().trim();
    try {
        console.log(eval(input));
    } catch (e) {
        console.warn(e);
    }
});
setInterval(refreshToken, 600000);
app.listen(8890)