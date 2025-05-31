import {Component, OnChanges, SimpleChanges, Input, ViewChild} from '@angular/core'
import { BaseChartDirective } from 'ng2-charts'
import { FormsModule } from '@angular/forms';

function div(x: number, y: number) {
  return ~~(x / y) // integer division
}

function rev(x: number) {
  return x - Math.floor(x / 360) * 360
}

function toDegrees(x: number) {
  return 180 * x / Math.PI
}

function toTime(degrees: number) {
 let hours = Math.floor(degrees / 15)
 let minutes = (degrees / 15 - hours) * 60
 return hours + ":" + Math.floor(minutes)
}

function sin(x: number) {
  return Math.sin(Math.PI * x / 180)
}

function cos(x: number) {
  return Math.cos(Math.PI * x / 180)
}

function tan(x: number) {
  return Math.tan(Math.PI * x / 180)
}

function asin(x: number) {
  return toDegrees(Math.asin(x))
}

function atan(x: number) {
  return toDegrees(Math.atan(x))
}

function atan2(x: number, y: number) {
  return toDegrees(Math.atan2(x, y))
}

class Earth {
  obliquity(dayNumber: number) {
    return 23.4393 - 3.563e-7 * dayNumber
  }

  gclat(latitude: number) {
    return latitude - 0.1924 * sin(2 * latitude)
  }

  rho(latitude: number) {
    return 0.99833 + 0.00167 * cos(2 * latitude)
  }
}

class Sun {
  longitudeOfPerihelion(dayNumber: number) {
    return 282.9404 + 4.70935e-5 * dayNumber
  }

  eccentricity(dayNumber: number) {
    return 0.016709 - 1.151e-9 * dayNumber
  }

  meanAnomaly(dayNumber: number) {
    return rev(356.0470 + 0.9856002585 * dayNumber)
  }

  meanLongitude(dayNumber: number) {
    return rev(this.longitudeOfPerihelion(dayNumber) + this.meanAnomaly(dayNumber))
  }

  eccentricAnomaly(dayNumber: number) {
    let M = this.meanAnomaly(dayNumber)
    let e = this.eccentricity(dayNumber)
    let E0 = M + (180 / Math.PI) * e * sin(M) * (1 + e * cos(M))
    return E0 // Schlyter
    // return E0 - (E0 - 180 * e * sin(E0) / Math.PI - M) / (1 - e * cos(E0))  // Taylor
  }
  
  x(dayNumber: number) {
    return cos(this.eccentricAnomaly(dayNumber)) - this.eccentricity(dayNumber)
  }

  y(dayNumber: number) {
    let e = this.eccentricity(dayNumber)
    return sin(this.eccentricAnomaly(dayNumber)) * Math.sqrt(1 - e * e)
  }

  distance(dayNumber: number) {
    let x = this.x(dayNumber)
    let y = this.y(dayNumber)
    return Math.sqrt(x * x + y * y)
  }

  trueAnomaly(dayNumber: number) {
    let x = this.x(dayNumber)
    let y = this.y(dayNumber)
    return atan2(y, x)
  }

  longitude(dayNumber: number) {
    return rev(this.trueAnomaly(dayNumber) + this.longitudeOfPerihelion(dayNumber))
  }

  xEcliptic(dayNumber: number) {
    return this.distance(dayNumber) * cos(this.longitude(dayNumber))
  }

  yEcliptic(dayNumber: number) {
    return this.distance(dayNumber) * sin(this.longitude(dayNumber))
  }

  xEquatorial(dayNumber: number) {
    return this.xEcliptic(dayNumber)
  }

  yEquatorial(dayNumber: number, earth: Earth) {
    return this.yEcliptic(dayNumber) * cos(earth.obliquity(dayNumber))
  }

  zEquatorial(dayNumber: number, earth: Earth) {
    return this.yEcliptic(dayNumber) * sin(earth.obliquity(dayNumber))
  }

  rightAscension(dayNumber: number, earth: Earth) {
    return rev(atan2(this.yEquatorial(dayNumber, earth), this.xEquatorial(dayNumber)))
  }
  
  declination(dayNumber: number, earth: Earth) {
    let x = this.xEquatorial(dayNumber)
    let y = this.yEquatorial(dayNumber, earth)
    return atan2(this.zEquatorial(dayNumber, earth), Math.sqrt((x * x + y * y)))
  }

  GMST0(dayNumber: number) {
    return this.meanLongitude(dayNumber) / 15 + 12
  }
  
  localSiderealTime(dayNumber: number, longitude: number) {
    let UT = (dayNumber % 1) * 24
    return this.GMST0(dayNumber) + UT + longitude / 15
  }
  
  hourAngle(dayNumber: number, longitude: number, earth: Earth) {
    return rev(this.localSiderealTime(dayNumber, longitude) * 15 - this.rightAscension(dayNumber, earth))
  }
  
  x2(dayNumber: number, longitude: number, earth: Earth) {
    return cos(this.hourAngle(dayNumber, longitude, earth)) * cos(this.declination(dayNumber, earth))
  }

  y2(dayNumber: number, longitude: number, earth: Earth) {
    return sin(this.hourAngle(dayNumber, longitude, earth)) * cos(this.declination(dayNumber, earth))
  }

  z2(dayNumber: number, longitude: number, earth: Earth) {
    return sin(this.declination(dayNumber, earth))
  }

  xHorizontal(dayNumber: number, longitude: number, latitude: number, earth: Earth) {
    return this.x2(dayNumber, longitude, earth) * sin(latitude) - this.z2(dayNumber, longitude, earth) * cos(latitude)
  }

  yHorizontal(dayNumber: number, longitude: number, latitude: number, earth: Earth) {
    return this.y2(dayNumber, longitude, earth)
  }

  zHorizontal(dayNumber: number, longitude: number, latitude: number, earth: Earth) {
    return this.x2(dayNumber, longitude, earth) * cos(latitude) + this.z2(dayNumber, longitude, earth) * sin(latitude)
  }

  azimuth(dayNumber: number, longitude: number, latitude: number, earth: Earth) {
    return rev(atan2(this.yHorizontal(dayNumber, longitude, latitude, earth), this.xHorizontal(dayNumber, longitude, latitude, earth)) + 180.0)
  }

  elevation(dayNumber: number, longitude: number, latitude: number, earth: Earth) {
    return asin(this.zHorizontal(dayNumber, longitude, latitude, earth))
  }
}

class Moon {
  longitudeOfAscendingNode(dayNumber: number) {
    return 125.1228 - 0.0529538083 * dayNumber
  }

  inclination = 5.1454
  
  argumentOfPerigee(dayNumber: number) {
    return 318.0634 + 0.1643573223 * dayNumber
  }

  meanDistance = 60.2666
  eccentricity = 0.054900

  meanAnomaly(dayNumber: number) {
    return rev(115.3654 + 13.0649929509 * dayNumber)
  }

  E0(dayNumber: number) {
    let M = this.meanAnomaly(dayNumber)
    let e = this.eccentricity
    return M + (180 / Math.PI) * e * sin(M) * (1 + e * cos(M))
  }
  
  E1(dayNumber: number, E0: number) {
    let M = this.meanAnomaly(dayNumber)
    let e = this.eccentricity
    return E0 - (E0 - (180.0 / Math.PI) * e * sin(E0) - M) / (1 - e * cos(E0))
  }

  E(dayNumber: number) {
    let E = this.E0(dayNumber)
    E = this.E1(dayNumber, E)
    E = this.E1(dayNumber, E)
    return E
  }

  x(dayNumber: number) {
    return this.meanDistance * (cos(this.E(dayNumber)) - this.eccentricity)
  }
  
  y(dayNumber: number) {
    let e = this.eccentricity
    return this.meanDistance * Math.sqrt(1 - e * e) * sin(this.E(dayNumber))
  }

  r(dayNumber: number) {
    let x = this.x(dayNumber)
    let y = this.y(dayNumber)
    return Math.sqrt(x * x + y * y)
  }
  
  v(dayNumber: number) {
    let x = this.x(dayNumber)
    let y = this.y(dayNumber)
    return rev(atan2(y, x))
  }

  xeclip(dayNumber: number) {
    let N = this.longitudeOfAscendingNode(dayNumber)
    let v = this.v(dayNumber)
    let w = this.argumentOfPerigee(dayNumber)
    return this.r(dayNumber) * (cos(N) * cos(v + w) - sin(N) * sin(v + w) * cos(this.inclination))
  }

  yeclip(dayNumber: number) {
    let N = this.longitudeOfAscendingNode(dayNumber)
    let v = this.v(dayNumber)
    let w = this.argumentOfPerigee(dayNumber)
    return this.r(dayNumber) * (sin(N) * cos(v + w) + cos(N) * sin(v + w) * cos(this.inclination))
  }
  
  zeclip(dayNumber: number) {
    let v = this.v(dayNumber)
    let w = this.argumentOfPerigee(dayNumber)
    return this.r(dayNumber) * sin(v + w) * sin(this.inclination)
  }

  longitudeEcl(dayNumber: number) {
    return rev(atan2(this.yeclip(dayNumber), this.xeclip(dayNumber)))
  }

  latitudeEcl(dayNumber: number) {
    let x = this.xeclip(dayNumber)
    let y = this.yeclip(dayNumber)
    return atan2(this.zeclip(dayNumber), Math.sqrt(x * x + y * y))
  }

  meanLongitude(dayNumber: number) {
    return this.longitudeOfAscendingNode(dayNumber) + this.argumentOfPerigee(dayNumber) + this.meanAnomaly(dayNumber)
  }

  meanElongation(dayNumber: number, sun: Sun) {
    return this.meanLongitude(dayNumber) - sun.meanLongitude(dayNumber)
  }

  argumentOfLatitude(dayNumber: number) {
    return this.meanLongitude(dayNumber) - this.longitudeOfAscendingNode(dayNumber)
  }
  
  dLongitude(dayNumber: number, sun: Sun) {
    let Mm = this.meanAnomaly(dayNumber)
    let D = this.meanElongation(dayNumber, sun)
    let Ms = sun.meanAnomaly(dayNumber)
    let F = this.argumentOfLatitude(dayNumber)
    return -1.274 * sin(Mm - 2*D)
      +0.658 * sin(2*D)
      -0.186 * sin(Ms)
      -0.059 * sin(2*Mm - 2*D)
      -0.057 * sin(Mm - 2*D + Ms)
      +0.053 * sin(Mm + 2*D)
      +0.046 * sin(2*D - Ms)
      +0.041 * sin(Mm - Ms)
      -0.035 * sin(D)
      -0.031 * sin(Mm + Ms)
      -0.015 * sin(2*F - 2*D)
      +0.011 * sin(Mm - 4*D)
  }

  dLatitude(dayNumber: number, sun: Sun) {
    let Mm = this.meanAnomaly(dayNumber)
    let D = this.meanElongation(dayNumber, sun)
    let F = this.argumentOfLatitude(dayNumber)
    return -0.173 * sin(F - 2*D)
      -0.055 * sin(Mm - F - 2*D)
      -0.046 * sin(Mm + F - 2*D)
      +0.033 * sin(F + 2*D)
      +0.017 * sin(2*Mm + F)
  }
  
  dDistance(dayNumber: number, sun: Sun) {
    let Mm = this.meanAnomaly(dayNumber)
    let D = this.meanElongation(dayNumber, sun)
    return -0.58 * cos(Mm - 2*D)   // TODO: difference here between Schlyter and Taylor
      -0.46 * cos(2*D)
  }

  longitude(dayNumber: number, sun: Sun) {
    return this.longitudeEcl(dayNumber) + this.dLongitude(dayNumber, sun)
  }

  latitude(dayNumber: number, sun: Sun) {
    return this.latitudeEcl(dayNumber) + this.dLatitude(dayNumber, sun)
  }

  distance(dayNumber: number, sun: Sun) {
    return this.r(dayNumber) + this.dDistance(dayNumber, sun)
  }

  X(dayNumber: number, sun: Sun) {
    return cos(this.latitude(dayNumber, sun)) * cos(this.longitude(dayNumber, sun))
  }

  Y(dayNumber: number, sun: Sun) {
    return cos(this.latitude(dayNumber, sun)) * sin(this.longitude(dayNumber, sun))
  }

  Z(dayNumber: number, sun: Sun) {
    return sin(this.latitude(dayNumber, sun))
  }

  xEquat(dayNumber: number, sun: Sun) {
    return this.X(dayNumber, sun)
  }

  yEquat(dayNumber: number, sun: Sun, earth: Earth) {
    let obliquity = earth.obliquity(dayNumber)
    return this.Y(dayNumber, sun) * cos(obliquity) - this.Z(dayNumber, sun) * sin(obliquity)
  }

  zEquat(dayNumber: number, sun: Sun, earth: Earth) {
    let obliquity = earth.obliquity(dayNumber)
    return this.Y(dayNumber, sun) * sin(obliquity) + this.Z(dayNumber, sun) * cos(obliquity)
  }

  rightAscension(dayNumber: number, sun: Sun, earth: Earth) {
   return rev(atan2(this.yEquat(dayNumber, sun, earth), this.xEquat(dayNumber, sun)))
  }

  declination(dayNumber: number, sun: Sun, earth: Earth) {
    let x = this.xEquat(dayNumber, sun)
    let y = this.yEquat(dayNumber, sun, earth)
    return atan2(this.zEquat(dayNumber, sun, earth), Math.sqrt(x * x + y * y))
  }

  mpar(dayNumber: number, sun: Sun) {
    return asin(1/this.distance(dayNumber, sun))
  }

  HA(dayNumber: number, longitude: number, sun: Sun, earth: Earth) {
    let LST = sun.localSiderealTime(dayNumber, longitude) * 15  // this belongs to sun ?
    let RA = this.rightAscension(dayNumber, sun, earth)
    return rev(LST - RA)
  }

  g(dayNumber: number, longitude: number, latitude: number, sun: Sun, earth: Earth) {
    let gclat = earth.gclat(latitude)
    let HA = this.HA(dayNumber, longitude, sun, earth)
    return atan(tan(gclat) / cos(HA))
  }
  
  topRA(dayNumber: number, longitude: number, latitude: number, sun: Sun, earth: Earth) {
    let RA = this.rightAscension(dayNumber, sun, earth)
    let mpar = this.mpar(dayNumber, sun)
    let rho = earth.rho(latitude)
    let gclat = earth.gclat(latitude)
    let HA = this.HA(dayNumber, longitude, sun, earth)
    let decl = this.declination(dayNumber, sun, earth)
    return RA - mpar * rho * cos(gclat) * sin(HA) / cos(decl)
  }

  topDecl(dayNumber: number, longitude: number, latitude: number, sun: Sun, earth: Earth) {
    let decl = this.declination(dayNumber, sun, earth)
    let mpar = this.mpar(dayNumber, sun)
    let rho = earth.rho(latitude)
    let gclat = earth.gclat(latitude)
    let g = this.g(dayNumber, longitude, latitude, sun, earth)
    return decl - mpar * rho * sin(gclat) * sin(g - decl) / sin(g)
  }
 
  HA2(dayNumber: number, longitude: number, latitude: number, sun: Sun, earth: Earth) {
   let lst = sun.localSiderealTime(dayNumber, longitude) * 15
   let ra = this.topRA(dayNumber, longitude, latitude, sun, earth)
   let ha = lst - ra
   if (ha > 180) ha = ha - 360
   if (ha < 180) ha = ha + 360
   return ha
  }

  azimuth(dayNumber: number, longitude: number, latitude: number, sun: Sun, earth: Earth) {
    let temp1 = sin(this.topDecl(dayNumber, longitude, latitude, sun, earth))
    let temp2 = cos(this.topDecl(dayNumber, longitude, latitude, sun, earth))
    let temp3 = sin(latitude) * temp1 + cos(latitude) * temp2 * cos(this.HA2(dayNumber, longitude, latitude, sun, earth))
    let temp4 = Math.sqrt(1 - temp3 * temp3)
    let temp5 = -sin(this.HA2(dayNumber, longitude, latitude, sun, earth)) * temp2 / temp4
    let temp6 = (temp1 - temp3 * sin(latitude)) / (temp4*cos(latitude))
    let temp7 = 0
    if (temp6 < 0) temp7 = (1 - temp6)/temp5
    if (temp6 > 0) temp7 = temp5 / (1 + temp6)
    let azimuth = 2 * atan(temp7)
    if (azimuth < 0) azimuth = azimuth + 360
    return azimuth
 }

  elevation(dayNumber: number, longitude: number, latitude: number, sun: Sun, earth: Earth) {
    let temp1 = sin(this.topDecl(dayNumber, longitude, latitude, sun, earth))
    let temp2 = cos(this.topDecl(dayNumber, longitude, latitude, sun, earth))
    let temp3 = sin(latitude) * temp1 + cos(latitude) * temp2 * cos(this.HA2(dayNumber, longitude, latitude, sun, earth))
    let temp4 = Math.sqrt(1 - temp3 * temp3)
    return atan(temp3 / temp4)
    }
}

@Component({
  selector: 'app-moon-calculator',
  imports: [FormsModule],
  templateUrl: './moon-calculator.html',
  styleUrl: './moon-calculator.css'
})

export class MoonCalculator implements OnChanges {
  @ViewChild(BaseChartDirective) chart!: BaseChartDirective

  earth: Earth
  sun: Sun
  moon: Moon
  date: Date
  
  myLocator: string = 'KP11MK'  //localStorage.getItem('myLocator'); TODO:
  dxLocator: string = 'KP00MK'
  
  myLongitude: number
  myLatitude: number
  dxLongitude: number
  dxLatitude: number

  utcYear: number
  utcMonth: number
  utcDay: number
  utcHour: number
  utcMinutes: number
  utcSeconds: number
  dayNumber: number

  constructor(){
    this.earth = new Earth
    this.sun = new Sun
    this.moon = new Moon
    this.date = new Date()
	  
	this.myLongitude = 0
	this.myLatitude = 0
	this.dxLongitude = 0
	this.dxLatitude = 0

    this.utcYear = this.date.getUTCFullYear()
    this.utcMonth = this.date.getUTCMonth() + 1
    this.utcDay = this.date.getUTCDate()
    this.utcHour = this.date.getUTCHours()
    this.utcMinutes = this.date.getUTCMinutes()
    this.utcSeconds = this.date.getUTCSeconds()
    this.dayNumber = this.julianDayNumber(this.utcYear, this.utcMonth, this.utcDay, this.utcHour + this.utcMinutes / 60.0 + this.utcSeconds / 3600.0)
  }
  barChartOptions: any = {

    tooltips: {
      displayColors: false,
      
      callbacks: {
        beforeTitle: function(tooltipItems: any, data: any) {
           return 'UTC ' + tooltipItems[0].xLabel
        },
        title: function(tooltipItems: any, data: any) {
           return 'Moon:'
        },
        afterTitle: function(tooltipItems: any, data: any) {
          return 'Elevation ' + Math.round(tooltipItems[0].yLabel * 10) / 10
        },
        beforeBody: function (tooltipItems: any, data: any) {
          console.log();
          return 'Azimuth    ' + Math.round(data.datasets[0].azimuth[tooltipItems[0].index] * 10) / 10
        },
        label: function(tooltipItem: any, data: any) {
          return ''
        },
      }
    },  

    scales: {
      yAxes: [{
      ticks: {
        min: 0,
        },
        scaleLabel: {
          display: true,
          labelString: 'Moon Elevation [degrees]'
        }
      }],
      xAxes: [{
        scaleLabel: {
          display: true,
          labelString: 'Time [UTC]'
        }
      }]
    },
      responsive: true
  }

  public barChartLabels = ['00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21.30', '22:00', '22:30', '23:00', '23:30', '24:00']
  
  
  public barChartData: {
    data: (number | null)[];
    label: string;
    azimuth: (number | null)[];
  }[] = [
      { data: [null], label: 'My locator', azimuth: [null] },
      { data: [null], label: 'DX locator', azimuth: [null] },
	];
  
  isLocatorValid(locator: string){
    var loc = locator.toLowerCase()
    if (loc.length != 6 ||
      loc[0] < 'a'      ||
      loc[0] > 'r'      ||
      loc[1] < 'a'      ||
      loc[1] > 'r'      ||
      loc[2] < '0'      ||
      loc[2] > '9'      ||
      loc[3] < '0'      ||
      loc[3] > '9'      ||
      loc[4] < 'a'      ||
      loc[4] > 'x'      ||
      loc[5] < 'a'      ||
      loc[5] > 'x')
        return false
    return true
  }
  
  update(){
    this.utcYear = this.date.getFullYear()
    this.utcMonth = this.date.getMonth() + 1
    this.utcDay = this.date.getDate()

    if (this.isLocatorValid(this.myLocator)){
      
      localStorage.setItem('myLocator', this.myLocator);
      
      this.myLatitude = this.observerLatitude(this.myLocator)
      this.myLongitude = this.observerLongitude(this.myLocator)
      
      var i:number
      for (i = 0; i <= 48; i++) {
        var dayNumber = this.julianDayNumber(this.utcYear, this.utcMonth, this.utcDay, i/2.0)
        this.barChartData[0].data[i] = this.moon.elevation(dayNumber, this.myLongitude, this.myLatitude, this.sun, this.earth)
        this.barChartData[0].azimuth[i] = this.moon.azimuth(dayNumber, this.myLongitude, this.myLatitude, this.sun, this.earth)
       }
      this.barChartData[0].label = this.myLocator.toUpperCase()
    }
    else{
      var i:number
      for (i = 0; i <= 48; i++) {
        this.barChartData[0].data[i] = null
      }
      this.barChartData[0].label = 'My locator'
    }
    
    if (this.isLocatorValid(this.dxLocator)){
      this.dxLatitude = this.observerLatitude(this.dxLocator)
      this.dxLongitude = this.observerLongitude(this.dxLocator)
      
      var i:number
      for (i = 0; i <= 48; i++) {
        var dayNumber = this.julianDayNumber(this.utcYear, this.utcMonth, this.utcDay, i/2.0)
        this.barChartData[1].data[i] = this.moon.elevation(dayNumber, this.dxLongitude, this.dxLatitude, this.sun, this.earth)
      }
      this.barChartData[1].label = this.dxLocator.toUpperCase()
    }
    else{
      var i:number
      for (i = 0; i <= 48; i++) {
        this.barChartData[1].data[i] = null
      }
      this.barChartData[1].label = 'DX locator'
    }

    if (this.chart && this.chart.chart){
      this.chart.chart.update()
    }
  }
  
  onDateChange(date: Date) {
    this.date = date
    this.update()
  }
  
  ngOnChanges(changes: SimpleChanges) {

    for (let propName in changes) {  

      if (propName === 'myLocator' || propName === 'dxLocator')
        this.update()
    }
  }

  observerLongitude(locator: string) {
    locator = locator.toUpperCase()
    let field = 20 * (locator.charCodeAt(0) - 65) - 180
    let grid = 2 * (locator.charCodeAt(2) - 48)
    let subGrid = 5 * (locator.charCodeAt(4) - 65) / 60
    return field + grid + subGrid + 1/24
  }

  observerLatitude(locator: string) {
    locator = locator.toUpperCase()
    let field = 10 * (locator.charCodeAt(1) - 65) - 90
    let grid = locator.charCodeAt(3) - 48
    let subGrid = 2.5 * (locator.charCodeAt(5) - 65) / 60
    return field + grid + subGrid + 1/48
  }
  
  julianDayNumber(year: number, month: number, day: number, hour: number) {
    return 367 * year - div((7 * (year + (div((month + 9), 12)))), 4) + div((275 * month), 9) + day - 730530 + hour / 24.0
  }
}
