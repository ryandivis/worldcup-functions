const admin = require('firebase-admin');
const Promise = require('bluebird');
const _ = require('lodash');

admin.initializeApp();

processTasks();

async function processTasks() {
  let users = await getCollection('users');
  const groups = await getCollection('groups');
  const originalGroups = await getCollection('originalGroups');
  let matches = await getCollection('matches');
  const matchSelections = await getCollection('matchSelections');
  const groupSelections = await getCollection('selections');

  _.forEach(users, user => {
    user['points'] = 0;
    user['matchPoints'] = 0;
    user['groupPoints'] = 0;
    user['groupSelection'] = getUserSelection(user['id'], groupSelections);
    user['matchSelection'] = getUserSelection(user['id'], matchSelections);
    if (user['matchSelection']) {
      _.forEach(matches, match => {
        let userPick = _.find(user['matchSelection']['matches'], (value, key) => {
          return key === match.id;
        });
        if (!_.isNil(userPick) && match.result === userPick) {
          if (!match['correct']) {
            match['correct'] = 1;
          } else {
            match['correct'] += 1;
          }
          user['matchPoints'] += 1;
        }
      })
    }
    if (user['groupSelection']) {
      _.forEach(groups, group => {
        let userPick = _.find(user['groupSelection']['groups'], selection => {
          return selection.name === group.name;
        });
        let userTopTwo = userPick['teams'].slice(0, 2);
        let groupTopTwo = group['teams'].slice(0, 2);
        for (let i = 0; i < 2; i++) {
          if (_.includes(groupTopTwo, userTopTwo[i])) {
            user['groupPoints'] += 2;
          }
        }
        if (userTopTwo[0] === groupTopTwo[0]) {
          user['groupPoints'] += 1;
        }
        if (userTopTwo[1] === groupTopTwo[1]) {
          user['groupPoints'] += 1;
        }
      });
    }
    if (user['groupPoints'] === 0) {
      user['groupPoints'] = 23;
    }
    user['points'] = user['matchPoints'] + user['groupPoints'];
  })
  users = _.orderBy(users, ['points'], ['desc']);
  console.log('NAME', 'POINTS', 'MATCH-POINTS', 'GROUP-POINTS');
  _.forEach(users, user => {
    if (!user['groupSelection']) {
      user['groupSelection'] = originalGroups;
    }
    if (!user['matchSelection']) {
      user['matchSelection'] = {};
    }
    updateUser(user);
    console.log(user['name'], user['points'], user['matchPoints'], user['groupPoints']);
  })
  // _.forEach(matches, match => {
  //   if (!match['correct']) {
  //     match['correct'] = 0;
  //   }
  // });
  // matches = _.orderBy(matches, ['correct'], ['desc']);
  // _.forEach(matches, match => {
  //   console.log(match);
  // });
}

async function getCollection(coll) {
  let items = await admin.firestore().collection(coll).get();
  items = _.map(items['docs'], item => {
    item = _.assignIn({
      id: item.id
    }, item.data());
    return item;
  })
  return items;
}

async function updateUser(user) {
  return await admin.firestore().collection('users').doc(user['id']).update({
    points: user['points'],
    groupPoints: user['groupPoints'],
    matchPoints: user['matchPoints'],
    groupSelection: user['groupSelection'],
    matchSelection: user['matchSelection']
  });
}

function getUserSelection(userId, selections) {
  return _.find(selections, selection => {
    return selection.userId === userId
  })
}

//GOOGLE_CLOUD_PROJECT=we-remember-world-cup node calcPoints.js