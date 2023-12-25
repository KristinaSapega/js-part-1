'use strict';

async function getDataAsync(url) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        redirect: 'follow',
    });
    if (response.ok) {
        return response.json();
    }
    const error = {
        status: response.status,
        customError: 'wtfAsync',
    };
    throw error;
}
const getData = getDataAsync;
async function loadCountriesData() {
    try {
        const countries = await getData('https://restcountries.com/v3.1/all?fields=name&fields=cca3&fields=area');
        return countries.reduce((result, country) => {
            result[country.cca3] = country;
            return result;
        }, {});
    } catch (error) {
        throw error;
    }
}
const fromCountry = document.getElementById('fromCountry');
const toCountry = document.getElementById('toCountry');
const countriesList = document.getElementById('countriesList');
const submit = document.getElementById('submit');
const output = document.getElementById('output');
(async () => {
    fromCountry.disabled = true;
    toCountry.disabled = true;
    submit.disabled = true;
    output.textContent = 'Loading…';
    let countriesData;
    try {
        countriesData = await loadCountriesData();
    } catch (error) {
        output.textContent = 'Something went wrong. Try to reset your computer.';
        return;
    }
    output.textContent = '';
    // Заполняем список стран для подсказки в инпутах
    Object.keys(countriesData)
        .sort((a, b) => countriesData[b].area - countriesData[a].area)
        .forEach((code) => {
            const option = document.createElement('option');
            option.value = countriesData[code].name.common;
            countriesList.appendChild(option);
        });
    fromCountry.disabled = false;
    toCountry.disabled = false;
    submit.disabled = false;
    document.getElementById('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!fromCountry.value || !toCountry.value) {
            return;
        }
        output.textContent = `Calculating a route from ${fromCountry.value} to ${toCountry.value}...`;
        const countries = Object.entries(countriesData);
        const cca3CountryFrom = countries.find((c) => c[1].name.common === fromCountry.value)[0];
        const cca3CountryTo = countries.find((c) => c[1].name.common === toCountry.value)[0];
        const visitedFrom = { [cca3CountryFrom]: null };
        const queue = [cca3CountryFrom];
        let i = 0;
        while (i < queue.length) {
            const countryCode = queue[i];
            i += 1;
            // eslint-disable-next-line no-await-in-loop
            const countryData = await getData(
                `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name&fields=borders`
            );
            if (countryData.borders.includes(cca3CountryTo)) {
                visitedFrom[cca3CountryTo] = countryCode;
                break;
            }
            for (const borderCountry of countryData.borders) {
                if (!(borderCountry in visitedFrom)) {
                    visitedFrom[borderCountry] = countryCode;
                    queue.push(borderCountry);
                }
            }
        }
        if (!visitedFrom[cca3CountryTo]) {
            output.textContent = `There is no route from ${fromCountry.value} to ${toCountry.value}. Requests: ${i}`;
        } else {
            console.log(visitedFrom);
            const route = [];
            let currentCountry = cca3CountryTo;
            while (currentCountry) {
                route.push(currentCountry);
                currentCountry = visitedFrom[currentCountry];
            }
            route.reverse();
            const routeCountryNames = route.map((code) => countriesData[code].name.common);
            output.textContent = `The route may be: ${routeCountryNames.join(', ')}. Requests: ${i}`;
        }
    });
})();
