/** 
* Function for the shipper to update the acceleration reading for the shipment.
* @param {org.asset.tracker.AccelerationReading} tx
* @transaction
*/
async function AccelerationReading(tx) {
    console.log('AccelerationReading Transaction' + tx);

    let shipment = tx.shipment;
    let contract = shipment.contract;
    let maximumAcceleration = contract.maximumAcceleration;
    console.log('shipment: ' + shipment.shipmentId + 'contract: ' + contract.contractId + 'maximumAcceleration:  ' + maximumAcceleration);
    const factory = getFactory();
    //checking whether the acceleration exceeded the maximum acceleration mentioned in the contract
    if ((tx.accelerationX > maximumAcceleration) || (tx.accelerationY > maximumAcceleration) || (tx.accelerationZ > maximumAcceleration)) {
        var accelerationEvent = factory.newEvent('org.asset.tracker', 'AccelerationThresholdEvent');
        accelerationEvent.accelerationX = tx.accelerationX;
        accelerationEvent.accelerationY = tx.accelerationY;
        accelerationEvent.accelerationZ = tx.accelerationZ;
        accelerationEvent.message = "maximum accelerationn exceeded";
        accelerationEvent.latitude = tx.latitude;
        accelerationEvent.longitude = tx.longitude;
        console.log("tx.readingTime: " + tx.readingTime);
        if (tx.readingTime != null || tx.readingTime != undefined)
            accelerationEvent.readingTime = tx.readingTime;
        else
            accelerationEvent.readingTime = "";
        accelerationEvent.shipment = tx.shipment;
        //emitting the acceleration event on exceeding acceleration
        emit(accelerationEvent);
        console.log('AccelerationThresholdEvent emitted');
    }
    //adding acceleration data to the shipment accelaration array
    shipment.accelerationReadings.push(tx);
    const shipmentRegistry = await getAssetRegistry('org.asset.tracker.Shipment');
    await shipmentRegistry.update(shipment);
    console.log('shipment status updated');
}


/** 
* Function for the shipper to update the temperature reading for the shipment
* @param {org.asset.tracker.TemperatureReading} tx
* @transaction
*/
async function TemperatureReading(tx) {
    console.log('TemperatureReading Transaction' + tx);
    let shipment = tx.shipment;
    let contract = shipment.contract;
    let minimumTemperature = contract.minimumTemperature;
    let maximumTemperature = contract.maximumTemperature;
    console.log('shipment: ' + shipment.shipmentId + 'contract: ' + contract.contractId + 'minimumTemperature:  ' + minimumTemperature + 'maximumTemperature' + maximumTemperature);
    const factory = getFactory();
    //checking whether the temperatue changed from the temperature range
    if ((tx.celsius < minimumTemperature) || (tx.celsius > maximumTemperature)) {
        var TemperatureEvent = factory.newEvent('org.asset.tracker', 'TemperatureThresholdEvent');
        TemperatureEvent.temperature = tx.celsius;
        if (tx.celsius < minimumTemperature)
            TemperatureEvent.message = "Temperature lower than the minimum";
        else
            TemperatureEvent.message = "Temperature higher than the maximum";
        TemperatureEvent.latitude = tx.latitude;
        TemperatureEvent.longitude = tx.longitude;
        //reading time is optional in the TemperatureReading transaction, so checking whether it entered
        if (tx.readingTime != null || tx.readingTime != undefined)
            TemperatureEvent.readingTime = tx.readingTime;
        else
            TemperatureEvent.readingTime = "";
        TemperatureEvent.shipment = tx.shipment;
        //emitting the temperature threshold event on changing temperature from minimumor maximum value 
        emit(TemperatureEvent);
        console.log('TemperatureThresholdEvent emitted');

    }

    //adding temperature data to the shipment temperature array
    shipment.temperatureReadings.push(tx);
    const shipmentRegistry = await getAssetRegistry('org.asset.tracker.Shipment');
    await shipmentRegistry.update(shipment);
    console.log('shipment status updated');

}

/** 
* Function for the shipper to update the GPS reading for the shipment.
* @param {org.asset.tracker.GPSReading} tx
* @transaction
*/
async function GPSReading(tx) {
    console.log('GPSReading Transaction' + tx);
    let shipment = tx.shipment;
    let contract = shipment.contract;
    let importerLocation = contract.importer.importerAddress;
    console.log('shipment: ' + shipment.shipmentId + 'contract: ' + contract.contractId + 'importerLocation:  ' + importerLocation);
    const factory = getFactory();
    //checking whether shipment reached in port by comparing importer address
    if ((tx.latitude + tx.longitude + tx.latitudeDirection + tx.longitudeDirection === importerLocation)) {
        var ShipmentInAPortEvent = factory.newEvent('org.asset.tracker', 'ShipmentInAPortEvent');
        ShipmentInAPortEvent.shipment = tx.shipment;
        ShipmentInAPortEvent.message = "Shipment reached in Port";
        //on reaching port emitting ShipmentInAPortEvent
        emit(ShipmentInAPortEvent);
        console.log('ShipmentInAPortEvent emitted');
    }
    //adding gps reading data to the shipment gpsReadings array
    shipment.gpsReadings.push(tx);
    const shipmentRegistry = await getAssetRegistry('org.asset.tracker.Shipment');
    await shipmentRegistry.update(shipment);
    console.log('shipment status updated');
}

/** 
* Function notify whether the shipment has been successfully received by the importer and 
* to run the calculations for updating the balances of the exporter, the importer, and the shipper.
* @param {org.asset.tracker.ShipmentReceived} tx
* @transaction
*/
async function ShipmentReceived(tx) {
    console.log('ShipmentReceived Transaction' + tx);
    let shipment = tx.shipment;
    let unitCount = shipment.unitCount;
    let contract = shipment.contract;
    let unitPrice = contract.unitPrice;
    let totalPayout = unitPrice * unitCount;
    let arrivalDateTime = contract.arrivalDateTime;
    let minimumTemperature = contract.minimumTemperature;
    let maximumTemperature = contract.maximumTemperature;
    let maximumPenaltyFactor = contract.maximumPenaltyFactor;
    let minimumPenaltyFactor = contract.minimumPenaltyFactor;
    console.log("maximumPenaltyFactor ::: "+maximumPenaltyFactor+"  minimumPenaltyFactor ::"+minimumPenaltyFactor);
    let recievedDateTime = new Date();
    let minimumPenalty = 0;
    let maximumPenalty = 0;
    //checking whether the shipment is late as per the contract, if late seting the payout to 0
    if (arrivalDateTime < recievedDateTime) {
        totalPayout = 0;
    }
    //checking whether the payout is 0, if payout is 0 no changes in the participant balances
    if (totalPayout != 0) {
        let temperatureReadings = shipment.temperatureReadings;
        tempLen = temperatureReadings.length;
        let minRecordedTemp = 0;
        let maxRecordedTemp = 0;
        //Loopig over the temperature record of the shipment and finding the minimum and maximum temperature
        for (i = 0; i < tempLen; i++) {
            if (i == 0) {
                minRecordedTemp = temperatureReadings[i].celsius;
                maxRecordedTemp = temperatureReadings[i].celsius;
            } else if (minRecordedTemp > temperatureReadings[i].celsius) {
                minRecordedTemp = temperatureReadings[i].celsius;
            } else if (maxRecordedTemp < temperatureReadings[i].celsius) {
                maxRecordedTemp = temperatureReadings[i].celsius;
            }
            console.log(i+"--> minRecordedTemp  " + minRecordedTemp + "  maxRecordedTemp  " + maxRecordedTemp);
        }
        //checking whether the recorded temperature exceeded the maximum temperature in the contract, if so calculating the penalty
        if (maximumTemperature < maxRecordedTemp) {
            maximumPenalty = maximumPenaltyFactor * (maxRecordedTemp - maximumTemperature);
        }
        //checking whether the recorded temperature is lower than the minimum temperature in the contract, if so calculating the penalty        
        if (minimumTemperature > minRecordedTemp) {
            minimumPenalty = minimumPenaltyFactor * (minimumTemperature - minRecordedTemp);
        }
        console.log("After applying temperature range:: maximumPenalty->"+maximumPenalty+" :: minimumPenalty-->"+minimumPenalty);
    
        let maximumAcceleration = contract.maximumAcceleration;
        let accelerationReadings = shipment.accelerationReadings;

        accLen = accelerationReadings.length;
        let recorededMaxAcceleration = 0;
        //Loopig over the acceleration record of the shipment and finding the maximum acceleration       
        for (i = 0; i < accLen; i++) {
            console.log(i+"-->accX :: "+accelerationReadings[i].accelerationX+"  accY :: "+accelerationReadings[i].accelerationY+" accZ ::"+accelerationReadings[i].accelerationZ)
            if (accelerationReadings[i].accelerationX > accelerationReadings[i].accelerationY) {
                if (accelerationReadings[i].accelerationX > accelerationReadings[i].accelerationZ) {
                    if (accelerationReadings[i].accelerationX > recorededMaxAcceleration)
                        recorededMaxAcceleration = accelerationReadings[i].accelerationX;
                } else if (accelerationReadings[i].accelerationZ > recorededMaxAcceleration) {
                    recorededMaxAcceleration = accelerationReadings[i].accelerationZ;
                }
            } else if (accelerationReadings[i].accelerationY > accelerationReadings[i].accelerationZ) {
                if (accelerationReadings[i].accelerationY > recorededMaxAcceleration)
                    recorededMaxAcceleration = accelerationReadings[i].accelerationY;

            } else if (accelerationReadings[i].accelerationZ > recorededMaxAcceleration)
                recorededMaxAcceleration = accelerationReadings[i].accelerationZ;
        }

        //checking whether the recorded acceleration exceeded the maximum acceleration in the contract, if so calculating the penalty
        console.log("recorededMaxAcceleration :: "+recorededMaxAcceleration+"  contract maximumAcceleration :: "+maximumAcceleration);
        if (recorededMaxAcceleration > maximumAcceleration) {
            maximumPenalty += maximumPenaltyFactor * (recorededMaxAcceleration - maximumAcceleration);
        }
        console.log(" After appying Acceleration penalty maximumPenalty :: " + maximumPenalty);
        console.log("unitCount:: " + unitCount );
        //Calculating the total penalty by multiplying the penalty with the total number of assets
        let totalPenalty = unitCount * (maximumPenalty + minimumPenalty);

        console.log("totalPayout before deducting :: "+totalPayout+" totalPenalty ::: "+totalPenalty);
        totalPayout = totalPayout - totalPenalty;
       
        let importer = contract.importer;
        console.log("totalPayout :: "+totalPayout+"  importer.accountBalance ::: "+importer.accountBalance);
        //checking whether the importer have enough Balance         
        if (importer.accountBalance < totalPayout) {
            throw new Error('importer does not have enough Balance to pay the payout');
        } else {
            importer.accountBalance -= totalPayout;
            const importerRegistry = await getParticipantRegistry('org.asset.tracker.Importer');
            //updating the Importer balances after deducting total payout
            await importerRegistry.update(importer);
            console.log("Importer account balances updated");
        }
        let halfPayout = totalPayout / 2;
        let shipper = contract.shipper;
        console.log("halfPayout :: "+halfPayout+" Shipper account balances ::"+shipper.accountBalance);
        shipper.accountBalance += halfPayout;
        const shipperRegistry = await getParticipantRegistry('org.asset.tracker.Shipper');
        //updating the shipper balances after adding half of the total payout
        await shipperRegistry.update(shipper);
        console.log("Shipper account balances updated");

        let exporter = contract.exporter;
        console.log("halfPayout :: "+halfPayout+" exporter account balances ::"+exporter.accountBalance);
        exporter.accountBalance += halfPayout;
        const exporterRegistry = await getParticipantRegistry('org.asset.tracker.Exporter');
        //updating the exporter balances after adding half of the total payout
        await exporterRegistry.update(exporter);
        console.log("Exporter account balances updated");
    }

    const shipmentRegistry = await getAssetRegistry('org.asset.tracker.Shipment');
    const shipmentExist = await shipmentRegistry.get(shipment.shipmentId).catch(err => {
        console.log('shipment is not found in the shipmentregistry');
    }
    );
    //Checking whether the given shipment ID exist in the registry
    if (shipmentExist) {
        shipment.shipmentStatus = "ARRIVED";
        //updating the shipment registry with the new status
        await shipmentRegistry.update(shipment);
        console.log('shipment status updated');
    } else {
        throw new Error('shipment with this ID does not exists in the shipment registry');
    }

}
