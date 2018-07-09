import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as _ from 'lodash';

admin.initializeApp();

export class MatchSelection {
  public id: string;
  public date: string;
  public matches: {};
  public userId: string;
}

export class User {
  public id: string;
  public name: string;
  public points: number;
}

export const updatePoints = functions.firestore.document('matches/{id}').onUpdate((change, context) => {
  const newValue = change.after.data();
  if (newValue['result']) {
    return admin.firestore().collection('results').doc(context.params.id).set({
      date: newValue['date'],
      teams: newValue['teams'],
      result: newValue['result']
    });  
  } else {
    return null;
  }
});

export const doPointTotals = functions.firestore.document('results/{id}').onCreate((snap, context) => {
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
            } else {
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