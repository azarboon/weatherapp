import React from 'react';
import ReactDOM from 'react-dom';

const apiURL = process.env.ENDPOINT;

//const apiURL = '';

const getWeatherFromApi = async () => {
  try {
    const response = await fetch(`${apiURL}/weather`);
    return response.json();
  } catch (error) {
    console.error(error);
  }

  return {};
};

class Weather extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      icon: "",
      summary:"",
      city: "Helsinki, Finland"
    };
  }

  async componentWillMount() {
    const data = await getWeatherFromApi();
    const icon = data.weather[0].icon;
    const city = this.state.city;
    this.setState({
      icon: icon.slice(0, -1),
      summary: data.main
    });
  }

  render() {
    const { icon, summary, city } = this.state;

    return (
      <div className="weather">
        <div className="icon">
          {icon && <img src={`/img/${icon}.svg`} />}
        </div>
        <h1 className="city">{city}</h1>
        <div className="summary">
          <span className="item"><strong>{summary.temp}</strong> degrees</span>
          <span className="item"><strong>{summary.humidity}%</strong> humidity</span>
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <Weather />,
  document.getElementById('app')
);
