'use strict';

const SURVEYFILE = './surveys.json';
const request = require('request');

// builds a query to insert appropriate number of rows into surveyResponse table
const surveyResponse_query_constructor = (surveyResponse, surveyEncounterId) => {
  const responseValue_constructor = (surveyEncounterId) => (question) => (answer) =>
    "('"+surveyEncounterId+"','"+question+"','"+answer+"')";
  const responseValue_surveySpecific = responseValue_constructor(surveyEncounterId);
  const queryInit = (responseValues) => 
                      'INSERT INTO surveyResponse (surveyEncounter_surveyEncounterId, question, answer) VALUES ' + 
                      responseValues + ';';
  
  var responseValueArray = [];
  for (var question in surveyResponse) {
    if (!Array.isArray(surveyResponse[question])) {
      responseValueArray.push(responseValue_surveySpecific(question)(surveyResponse[question]));
    } else {
      const responseValue_questionSpecific = responseValue_surveySpecific(question);
      for (var answer of surveyResponse[question]) {
        responseValueArray.push(responseValue_questionSpecific(answer));
      }
    }
  }

  return queryInit(responseValueArray.join())
};

const surveyEncounter_query_constructor = (surveyEncounterInfo) => {
  const surveyEncounter_query = `INSERT INTO surveyEncounter
                                (surveyId, location, date, department, clinicalProgramId) VALUES
                                ('${surveyEncounterInfo.surveyId}',
                                 '${surveyEncounterInfo.location}',
                                 '${surveyEncounterInfo.date}',
                                 '${surveyEncounterInfo.department}',
                                 '${surveyEncounterInfo.clinicalProgramId}');`;
  return surveyEncounter_query;
};

const MOCK_LOCATIONS = [{uuid:"08feae7c-1352-11df-a1f1-0026b9348838", name:"Location-1"},
                        {uuid:"00b47ef5-a29b-40a2-a7f4-6851df8d6532", name:"Location-2"},
                        {uuid:"79fcf21c-8a00-44ba-9555-dde4dd877c4a", name:"Location-3"},
                        {uuid:"6cd0b441-d644-487c-8466-5820a73f9ce5", name:"Location-4"}];

module.exports = { routesFxn: (connection, validate) => [
{
  method: 'GET',
  path: '/getSurveys',
  handler: function(request, h) { 
    return h.file(SURVEYFILE);
  }
},
{
  method: 'GET',
  path: '/getLocations',
  handler: function(request, h) { 
    return MOCK_LOCATIONS;
  }
},
{
  method: 'POST',
  path: '/storeSurveys',
  handler: function(request, h) {
    return new Promise(
      (resolve, reject) => {
        connection.query(
          surveyEncounter_query_constructor(request.payload.encounterInfo),
          (error, _rows, _fields) => {
            if (error) {reject(error)}
          }
        );
        connection.query(
          'SELECT LAST_INSERT_ID();',
          (error, rows, _fields) => {
            if (error) {reject(error)}
            const surveyEncounterId = rows[0]["LAST_INSERT_ID()"];
            const surveyResponse_query = surveyResponse_query_constructor(request.payload.responseInfo, surveyEncounterId);
            
            connection.query(
              surveyResponse_query,
              (error, rows, _fields) => {
                if (error) {reject(error)}
              }
            );
          }
        );
      }
    );
  }
},
{
  method: 'POST',
  path: '/login',
  options: {
    auth: false
  },
  handler: function(request, h) {
    return validate({},request.payload.username, request.payload.password)
  }
},
{
  method: 'GET',
  path: '/logout',
  options: {
    auth: false
  },
  handler: function(req, h) {
    return new Promise(
      (resolve, reject) => {
        const callback = (_error, _response, _body) => '';
        request(
          { method: 'DELETE',
              url: 'https://ngx.ampath.or.ke/test-amrs/ws/rest/v1/session/',
            }, callback
        );    
      }
    )
  }
}
]}