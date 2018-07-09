"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const _ = require("lodash");
admin.initializeApp();
class MatchSelection {
}
exports.MatchSelection = MatchSelection;
class User {
}
exports.User = User;
exports.updatePoints = functions.firestore.document('matches/{id}').onUpdate((change, context) => {
    const newValue = change.after.data();
    if (newValue['result']) {
        return admin.firestore().collection('results').doc(context.params.id).set({
            date: newValue['date'],
            teams: newValue['teams'],
            result: newValue['result']
        });
    }
    else {
        return null;
    }
});
exports.doPointTotals = functions.firestore.document('results/{id}').onCreate((snap, context) => {
    const matchId = context.params.id;
    const newValue = snap.data();
    console.log(matchId, newValue);
    return admin.firestore().collection('users').get().then(users => {
        users.forEach(user => {
            admin.firestore().collection('matchSelections').where('userId', '==', user['id']).get().then(selections => {
                selections.forEach(doc => {
                    const selection = doc.data();
                    const result = _.find(selection['matches'], (res, key) => {
                        return key === matchId;
                    });
                    if (result === newValue['result']) {
                        const userUpdate = user.data();
                        if (!userUpdate['points']) {
                            userUpdate['points'] = 1;
                        }
                        else {
                            userUpdate['points'] += 1;
                        }
                        admin.firestore().collection('users').doc(user['id']).set(userUpdate, { merge: true }).then(response => {
                            console.log(response);
                        }, error => {
                            console.log(error);
                        });
                    }
                });
            })
                .catch(error => {
                console.log(error);
            });
        });
    })
        .catch(error => {
        console.log(error);
    });
});
//# sourceMappingURL=index.js.map