import React from 'react';
import ReactDOM from 'react-dom';

// import App from './App';
import registerServiceWorker from './registerServiceWorker';

import Geocode from "react-geocode";

import { Card, ListGroup, ListGroupItem } from 'reactstrap';

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAngleDown, faAngleUp } from '@fortawesome/free-solid-svg-icons'

import {
  TwitterShareButton,
  TwitterIcon
} from 'react-share';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

library.add(faAngleDown, faAngleUp)

const fp2      = require('fingerprintjs2');
const mixpanel = require('mixpanel-browser');
const q        = require('q');
const rp       = require('request-promise');

Geocode.enableDebug();


class FetchViolations extends React.Component {

  componentDidMount(){
    document.title = "How's My Driving NY"
  }

  constructor(props) {
    super(props);

    let that = this;

    this.state = {
      fingerprintID: null,
      lookupPlateID: '',
      lookupPlateType: 'PAS',
      lookupState: 'NY',
      mixpanelID: null,
      performingLookup: false,
      queriedVehicles: [],
      violations: {}
    }

    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);

    mixpanel.init('f8491ce35ed8262c61e16e6b6abb83b3', {
      loaded: (mixpanel) => {
        that.state.mixpanelID = mixpanel.get_distinct_id();
      }
    });
  }

  componentWillMount(){
    let that = this;

    if (!this.state.fingerprintID) {
      new fp2({excludeAdBlock: true}).get((result, components) => {
        console.log(result) // a hash, representing your device fingerprint
        // console.log(components) // an array of FP components

        that.state.fingerprintID = result
      })
    }
  }


  handleChange(event) {
    this.setState({[event.target.name]: event.target.value.toUpperCase()});
  }

  handleSubmit(event) {
    if (this.state.lookupPlateID && this.state.lookupState) {

      mixpanel.track('plate_lookup', {
        lookup_plate_id : this.state.lookupPlateType,
        plate           : this.state.lookupPlateID,
        state           : this.state.lookupState,
      })

      this.performLookup();
    }

    event.preventDefault();
  }


  organizeViolationsByDescription(violations) {
    let thing = violations.reduce(function(memo, x) {
      let violationsObj = memo['violations']
      if (!violationsObj[x['humanized_description']]) {
        violationsObj[x['humanized_description']] = {
          violationCount: 1,
          violationData: [x]
        }
      } else {
        let type = violationsObj[x['humanized_description']]
        if (type) {
          type['violationCount'] += 1
          type['violationData'].push(x)
        }
      }

      memo['total'] += 1;
      return memo;
    }, {
      total: 0,
      violations: {}
    });

    return thing;
  }


  performLookup() {
    let that = this;

    // Record that we are looking
    this.setState({performingLookup: true})

    let promises = [];

    let queryString = 'https://api.howsmydrivingny.nyc/api/v1/'
    queryString += '?plate_id=' + this.state.lookupPlateID
    queryString += '&state=' + this.state.lookupState
    queryString += '&fingerprint_id=' + this.state.fingerprintID
    queryString += '&mixpanel_id=' + this.state.mixpanelID
    queryString += '&lookup_source=web_client'

    if (this.state.lookupPlateType) {
      queryString += '&plate_type=' + this.state.lookupPlateType;
    }

    promises.push(
      rp(queryString)
    )

    q.all(promises).then(function(jsonResponse){


      let queryObj = JSON.parse(jsonResponse);
      let returnedViolations = queryObj.violations;

      returnedViolations.sort((a,b) => new Date(a.formatted_time) - new Date(b.formatted_time))

      const newVehicle = {
        frequency: queryObj.frequency,
        newViolations: queryObj.previous_count ? (queryObj.count - queryObj.previous_count) : 0,
        plateID: that.state.lookupPlateID,
        plateType: that.state.lookupPlateType,
        previous_count: queryObj.previous_count,
        previous_date: queryObj.previous_date,
        state: that.state.lookupState,
        streak_data: queryObj.streak_data,
        violations: returnedViolations,
        violations_count: queryObj.count,
      }

      let existingList = that.state.queriedVehicles;

      const existingVehicle = existingList.find(obj => {
        return obj.state === newVehicle.state && obj.plateID === newVehicle.plateID && obj.plateType === newVehicle.plateType
      })

      const index = existingList.indexOf(existingVehicle);
      if (index > -1) {
        existingList = existingList.slice(0, index).concat(existingList.slice(index + 1));
      }

      existingList.unshift(newVehicle);

      that.setState({performingLookup: false, queriedVehicles: existingList})

      // res.setHeader('Content-Type', 'application/json');
      // res.writeHead(200, {'Content-Type': 'application/javascript'});
      // res.end(JSON.stringify({violations: output}));
    })
  }


  render() {
    return (
      <div>
        <div className='container-fluid'>
          <div className='row'>
            <div className='col-md-12'>
              <div className='jumbotron'>
                <h1 className='display-4'>How's My Driving NY</h1>
                <p className="lead">
                  Search New York City <a className='open-data-link' href='https://data.cityofnewyork.us/browse?q=parking%20violations&sortBy=relevance'>parking & camera violations</a>
                </p>
                <hr className="my-1"></hr>
                <div className='row'>
                  <form className='form' onSubmit={this.handleSubmit}>
                    <div className='form-row'>
                      <div className='col-md'>
                        <div className='form-group'>
                          <input className='form-control' type="text" name='lookupPlateID' value={this.state.lookupPlateID} onChange={this.handleChange} placeholder='Enter a plate...' />
                        </div>
                      </div>
                      <div className='col-md'>
                        <div className='form-group'>
                          <select className='form-control' name='lookupState' value={this.state.lookupState} onChange={this.handleChange}>
                            {[['99', '99'], ['Alberta (AB)', 'AB'], ['Alaska (AK)', 'AK'], ['Alabama (AL)', 'AL'], ['Arkansas (AR)', 'AR'], ['Arizona (AZ)', 'AZ'], ['British Columbia (BC)', 'BC'], ['California (CA)', 'CA'], ['Colorado (CO)', 'CO'], ['Connecticut (CT)', 'CT'], ['District of Columbia (DC)', 'DC'], ['Delaware (DE)', 'DE'], ['U.S. State Department (DP)', 'DP'], ['Florida (FL)', 'FL'], ['Federated States of Micronesia (FM)', 'FM'], ['Foreign (FO)', 'FO'], ['Georgia (GA)', 'GA'], ['Guam (GU)', 'GU'], ['Government (GV)', 'GV'], ['Hawaii (HI)', 'HI'], ['Iowa (IA)', 'IA'], ['Idaho (ID)', 'ID'], ['Illinois (IL)', 'IL'], ['Indiana (IN)', 'IN'], ['Kansas (KS)', 'KS'], ['Kentucky (KY)', 'KY'], ['Louisiana (LA)', 'LA'], ['Massachusetts (MA)', 'MA'], ['Manitoba (MB)', 'MB'], ['Maryland (MD)', 'MD'], ['Maine (ME)', 'ME'], ['Michigan (MI)', 'MI'], ['Minnesota (MN)', 'MN'], ['Missouri (MO)', 'MO'], ['Northern Mariana Islands (MP)', 'MP'], ['Mississippi (MS)', 'MS'], ['Montana (MT)', 'MT'], ['Mexico (MX)', 'MX'], ['New Brunswick (NB)', 'NB'], ['North Carolina (NC)', 'NC'], ['North Dakota (ND)', 'ND'], ['Nebraska (NE)', 'NE'], ['Newfoundland (NF)', 'NF'], ['New Hampshire (NH)', 'NH'], ['New Jersey (NJ)', 'NJ'], ['New Mexico (NM)', 'NM'], ['Nova Scotia (NS)', 'NS'], ['Northwest Territories (NT)', 'NT'], ['Nevada (NV)', 'NV'], ['New York (NY)', 'NY'], ['Ohio (OH)', 'OH'], ['Oklahoma (OK)', 'OK'], ['Ontario (ON)', 'ON'], ['Oregon (OR)', 'OR'], ['Pennsylvania (PA)', 'PA'], ['Prince Edward Island (PE)', 'PE'], ['Puerto Rico (PR)', 'PR'], ['Palau (PW)', 'PW'], ['Quebec (QC)', 'QC'], ['Rhode Island (RI)', 'RI'], ['South Carolina (SC)', 'SC'], ['South Dakota (SD)', 'SD'], ['Saskatchewan (SK)', 'SK'], ['Tennessee (TN)', 'TN'], ['Texas (TX)', 'TX'], ['Utah (UT)', 'UT'], ['Virginia (VA)', 'VA'], ['U.S. Virgin Islands (VI)', 'VI'], ['Vermont (VT)', 'VT'], ['Washington (WA)', 'WA'], ['Wisconsin (WI)', 'WI'], ['West Virginia (WV)', 'WV'], ['Wyoming (WY)', 'WY'], ['Yukon Territories (YT)', 'YT']].map((region) =>
                              <option key={region[1]} value={region[1]}>{region[0]}</option>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className='form-row'>
                      <div className='col-md'>
                        <div className='form-group'>
                          <select className='form-control' name='lookupPlateType' value={this.state.lookupPlateType} onChange={this.handleChange}>
                            {[['Commercial (COM)', 'COM'], ['Motorcycles (MOT)', 'MOT'], ['Special Omnibus Rentals (OMS)', 'OMS'], ['For-hire Vehicle (OMT)', 'OMT'], ['Passenger (PAS)', 'PAS'], ['Emergency Services & Veterans (SRF)', 'SRF'], ['Tractor (TRC)', 'TRC']].map((type) =>
                              <option key={type} value={type[1]}>{type[0]}</option>
                            )}
                          </select>
                        </div>
                      </div>
                      <div className='col-md'>
                        <div className='form-group'>
                          <input className='form-control btn btn-primary' type="submit" value="Search" disabled={!this.state.lookupPlateID || this.performingLookup} />
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              <div className='vehicles'>
                {this.state.queriedVehicles.map((vehicle) =>
                  <div key={vehicle.state + ':' + vehicle.plateID + ':' + vehicle.plateType} className='card vehicle'>
                    <div className="card-header">
                      {vehicle.state}:{vehicle.plateID}:{vehicle.plateType}
                      <TwitterShareButton
                        url={'https://howsmydrivingny.nyc'}
                        title={"I just looked up #" + vehicle.state + "_" + vehicle.plateID + "_" + vehicle.plateType + "'s " + vehicle.violations_count + (vehicle.violations_count === 1 ? ' violation' : ' violations') + " using @HowsMyDrivingNY: "}
                        className="Demo__some-network__share-button">
                        <TwitterIcon
                          size={32}
                          round />
                      </TwitterShareButton>
                    </div>
                    <ListGroup className='list-group-flush'>
                      <ListGroupItem className='no-padding'>
                        <div className='split-list-group-item'>
                          Lookups: {vehicle.frequency}
                        </div>
                        {vehicle.previous_date &&
                          <div className='split-list-group-item'>
                            Recent: {new Date(vehicle.previous_date).toLocaleDateString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'})} {vehicle.newViolations > 0 ? ('(' + vehicle.newViolations + ' new tickets)') : ''}
                          </div>
                        }
                      </ListGroupItem>
                      {vehicle.streak_data.max_streak >= 5 &&
                        <ListGroupItem className='list-group-item-warning'>
                          <p>
                            Under
                            <a target='_blank' rel='noopener noreferrer' href='https://twitter.com/bradlander'>
                              @bradlander
                            </a>
                            's
                            <a target='_blank' rel='noopener noreferrer' href='http://legistar.council.nyc.gov/LegislationDetail.aspx?ID=3521908&GUID=A4FD4CFC-8AD8-4130-AA92-11BC56936F6D&Options=ID|Text|&Search=lander'>
                              proposed legislation
                            </a>, this vehicle could have been booted or impounded due to its {vehicle.streak_data.max_streak} camera violations (>= 5/year) from {new Date(vehicle.streak_data.min_streak_date).toLocaleDateString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'})} to {new Date(vehicle.streak_data.max_streak_date).toLocaleDateString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'})}.
                          </p>
                        </ListGroupItem>
                      }
                      <ListGroupItem>
                        <ViolationsList vehicle={vehicle}/>
                      </ListGroupItem>
                    </ListGroup>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

//{vehicle.violations_count} violations for

class ViolationsList extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      visible: false
    }
  }

  render() {
    let that = this;

    return (
      <div className='violations-table-wrapper' style={{width: '100%'}}>
        <div className='violations-table-header' onClick={() => (this.setState({visible: !this.state.visible}))}>
          Violations: {this.props.vehicle.violations_count}
          <span className='see-violations-table-link'>{this.state.visible ? '(hide violations)' : (this.props.vehicle.violations_count > 0 ? '(see violations)' : '')}</span>
        </div>
        {this.props.vehicle.violations_count > 0 && this.state.visible &&
          <ViolationsTable vehicle={this.props.vehicle}/>
        }
      </div>
    )
  }
}

class ViolationsTable extends React.Component {
    constructor(props) {
      super(props)

      this.state = {
        sortAscending: true,
        sortType: 'formatted_time',
        vehicle: props.vehicle,
        violations: props.vehicle.violations,
      }
    }

  render() {
    let that = this;

    return (
      <div className='table-responsive'>
        <table className='table table-striped table-sm violations-table'>
          <thead className='thead-light'>
            <tr>
              {this.renderTableHeader()}
            </tr>
          </thead>
          <tbody>
            {that.state.violations.sort((a,b) => {
              if (that.state.sortType === 'formatted_time') {
                if (that.state.sortAscending) {
                  return new Date(a.formatted_time) - new Date(b.formatted_time)
                } else {
                  return new Date(b.formatted_time) - new Date(a.formatted_time)
                }
              } else if (that.state.sortType === 'location') {
                let aLocation = a.violation_county + ' ' + (a.location === null ? '' : ('(' + a.location + ')'))
                let bLocation = b.violation_county + ' ' + (b.location === null ? '' : ('(' + b.location + ')'))

                if (that.state.sortAscending) {
                  if(aLocation < bLocation) return -1;
                  if(aLocation > bLocation) return 1;
                  return (new Date(a.formatted_time) - new Date(b.formatted_time))
                } else {
                  if(aLocation < bLocation) return 1;
                  if(aLocation > bLocation) return -1;
                  return (new Date(b.formatted_time) - new Date(a.formatted_time))
                }
              } else if (that.state.sortType === 'total_fine_amount') {
                let aFine = a.total_fine_amount ? parseFloat(a.total_fine_amount) : 0
                let bFine = b.total_fine_amount ? parseFloat(b.total_fine_amount) : 0

                if (that.state.sortAscending) {
                  if(aFine < bFine) return -1;
                  if(aFine > bFine) return 1;
                  return (new Date(a.formatted_time) - new Date(b.formatted_time))
                } else {
                  if(aFine < bFine) return 1;
                  if(aFine > bFine) return -1;
                  return (new Date(b.formatted_time) - new Date(a.formatted_time))
                }
              } else {
                if (that.state.sortAscending) {
                  if(a[that.state.sortType] < b[that.state.sortType]) return -1;
                  if(a[that.state.sortType] > b[that.state.sortType]) return 1;
                  return (new Date(a.formatted_time) - new Date(b.formatted_time))
                } else {
                  if(a[that.state.sortType] < b[that.state.sortType]) return 1;
                  if(a[that.state.sortType] > b[that.state.sortType]) return -1;
                  return (new Date(b.formatted_time) - new Date(a.formatted_time))
                }
              }
            }).map((violation) =>
              that.renderTablePart(violation)
            )}
          </tbody>
        </table>
      </div>
    )
  }

  renderTableHeader() {
    return (
      [{sort_type: 'formatted_time', display_text: 'Date'}, {sort_type: 'humanized_description', display_text: 'Type'}, {sort_type: 'location', display_text: 'Location'}, {sort_type: 'total_fine_amount', display_text: 'Fines'}].map((headerType) =>
        <th key={headerType.sort_type} className={this.state.sortType == headerType.sort_type ? 'sort-column' : ''} onClick={() => (this.state.sortType === headerType.sort_type ? this.setState({sortAscending: !this.state.sortAscending}) : this.setState({sortType: headerType.sort_type, sortAscending: false}))}>
          {headerType.display_text}
          {this.state.sortType == headerType.sort_type &&
            <FontAwesomeIcon icon={this.state.sortAscending ? 'angle-down' : 'angle-up'} />
          }
        </th>
      )
    )
  }

  renderTablePart(violation) {
    return (
      <tr key={violation.summons_number} className={violation.humanized_description === 'School Zone Speed Camera Violation' ? 'violation-row table-warning' : (violation.humanized_description === 'Failure to Stop at Red Light' ? 'violation-row table-danger' : 'violation-row') }>
        <td>
          {(new Date(violation.formatted_time).toLocaleDateString('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'}))}
        </td>
        <td>
          {violation.humanized_description}
        </td>
        <td>
          {violation.violation_county} {violation.location == null ? '' : ('(' + violation.location + ')')}
        </td>
        <td>
          {violation.total_fine_amount ? ('$' + violation.total_fine_amount) : 'N/A'}
        </td>
      </tr>
    )
  }
}


ReactDOM.render(
  <FetchViolations />,
  document.getElementById('root')
);

// ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
