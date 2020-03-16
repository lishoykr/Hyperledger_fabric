'use strict';

const {Contract} = require('fabric-contract-api');
class pharmanetContract extends Contract {
	
	constructor() {
		// Provide a custom name to refer to this smart contract
		super('org.pharma-network.pharmanet');
	}
	
	/* ****** All custom functions are defined below ***** */
	
	// This is a basic user defined function used at the time of instantiating the smart contract
	// to print the success message on console
	async instantiate(ctx) {
		console.log('pharmanet Smart Contract Instantiated');
	}

	/**
	 * Create a new company account on the network
	 * @param ctx - The transaction context object
	 * @param companyCRN - This field company Registration Number (CRN) and the Name of the company
	 * @param companyName - Name of the company
	 * @param Location- Location of the company
	 * @param organisationRole - This field will take either of the following roles:Manufacturer,Distributor,Retailer,Transporter
	 */
	async registerCompany(ctx, companyCRN, companyName, Location, organisationRole) {
		// Create a new composite key for the new company account
		const companyID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.company', [companyCRN,companyName]);
		let hierarchyKey;
		switch(organisationRole){
		case "Manufacturer":
			hierarchyKey=1;
		     break;
		case "Distributor":
			hierarchyKey=2;
		     break;
		case "Retailer":
			hierarchyKey=3;
		     break;
		default:
			hierarchyKey="";
		     break;

		}
		// Create a company object to be stored in blockchain
		let newCompanyObject = {
			companyID: companyID,
			name: companyName,
			location: location,
			organisationRole: organisationRole,
			hierarchyKey: hierarchyKey
			
		};
		
		// Convert the JSON object to a buffer and send it to blockchain for storage
		let dataBuffer = Buffer.from(JSON.stringify(newCompanyObject));
		await ctx.stub.putState(companyID, dataBuffer);
		// Return value of new company account created to user
		return newCompanyObject;
	}
	



	
	/**
	 * This function is used to register a new medicine on the ledger. 
	 * @param ctx - The transaction context object
	 * @param medicineName - medicine Name
	 * @param serialNo - serial number of the medicine 
	 * @param mfgData -Date of manufacturing of the drug
	 * @param expDate - Expiration date of the drug
	 * @param companyCRN - company Registration Number
	 * @returns
	 */
	async addDrug(ctx, medicineName, serialNo, mfgData, expDate, companyCRN) {
		// Create a new composite key for the new student account
		const productID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [serialNo,medicineName]);
		
		// Create a student object to be stored in blockchain
		let newDrugObject = {
			productID: productID,
			name: medicineName,
			manufacturer: companyCRN,
			manufacturingDate: mfgDate,
			expiryDate: expDate,
			owner:companyCRN ,
			shipment: ''

		};
		
		// Convert the JSON object to a buffer and send it to blockchain for storage
		let dataBuffer = Buffer.from(JSON.stringify(newDrugObject));
		await ctx.stub.putState(productID, dataBuffer);
		// Return value of new student account created to user
		return newDrugObject;
	}

	
	/**
	 * This function is used to register a new purchase order on the ledger.  
	 * @param ctx - The transaction context object
	 * @param buyerCRN-CRN number of the buyer
	 * @param sellerCRN-CRN number of the seller
	 * @param drugName-the name of the drug for which the PO is raised.
	 * @param quantity- the number of units required.
	 */
	async createPO(ctx,buyerCRN, sellerCRN, drugName, quantity){
	
	const poID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug.request', [serialNo,medicineName]);
		
		// Create a student object to be stored in blockchain
		let newPOObject = {
			poID: poID,
			drugName: drugName,
			quantity: quantity,
			buyer: buyerCRN,
			seller: sellerCRN
		};		

		// Convert the JSON object to a buffer and send it to blockchain for storage
		let dataBuffer = Buffer.from(JSON.stringify(newPOObject));
		await ctx.stub.putState(poID, dataBuffer);
		// Return value of new asset created
		return newPOObject;
	}




	/**
	 * This function is used by the seller to transport the consignment via a transporter corresponding to each PO
	 * @param ctx - The transaction context object
	 * @param buyerCRN-CRN number of the buyer
	 * @param medicineName-name ofthe medicine
	 * @param listOfAssets-A list of the composite keys of all the assets that are being shipped in this consignment.
	 * @param transporterCRN-CRN number of the transporter
	 */
	async createShipment(ctx,buyerCRN, medicineName, listOfAssets, transporterCRN){
	
	const shipmentID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug.shipment', [buyerCRN,medicineName]);
		
		// Create a student object to be stored in blockchain
		let newshipmentObject = {
			shipmentID: shipmentID,
			creator: creator,
			assets: assetArray,
			transporter: transporterCRN,
			status: "in-transit" 

		};
		
		// Convert the JSON object to a buffer and send it to blockchain for storage
		let dataBuffer = Buffer.from(JSON.stringify(newshipmentObject));
		await ctx.stub.putState(shipmentID, dataBuffer);
		// Return value of new shipment asset created 
		return newshipmentObject;
	}



	/**
	 * This transaction is used to update the status of the shipment to ‘Delivered’ when the consignment gets delivered.
	 * @param ctx - The transaction context object
	 * @param buyerCRN -CRN number of the buyer
	 * @param medicineName- name of the medicine
	 * @param transporterCRN -CRN number of the transporter
	 */
	async updateShipment(ctx, buyerCRN, medicineName, transporterCRN)
	{
		const shipmentID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug.shipment', [buyerCRN,medicineName]);
		let shipmentBuffer= await ctx.stub.getState(shipmentID).catch(err => console.log(err));
		let shipmentObject= JSON.parse(shipmentBuffer.toString());
		if (shipmentObject.transporter == transporterCRN)
		{
			shipmentObject.status= "Delivered";
			let dataBuffer = Buffer.from(JSON.stringify(shipmentObject));
			await ctx.stub.putState(shipmentID, dataBuffer);


		}
		else
			throw new Error('transporter : '+ transporterCRN + ' not authorized to update the medicine: '+ medicineName + '');
	}


	/**
	 * This transaction is called by the retailer while selling the drug to a consumer.
	 * @param ctx - The transaction context object
	 * @param drugName-name of the medicine
	 * @param serialNo-serial number of the medicine
	 * @param retailerCRN-CRN number of the retailer
	 * @param customerAadhar-Aadhar number of the customer
	 */
	async retailDrug(ctx,drugName, serialNo, retailerCRN, customerAadhar)
	{

		const drugID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [serialNo,drugName]);		
		let drugBuffer= await ctx.stub.getState(drugID).catch(err => console.log(err));
		let drugObject= JSON.parse(drugBuffer.toString());
		if (drugObject.owner == retailerCRN)
		{
			drugObject.owner= customerAadhar;
			let dataBuffer = Buffer.from(JSON.stringify(drugObject));
			await ctx.stub.putState(drugID, dataBuffer);
		}
		else
			throw new Error('drug : '+ drugName + 'is not owned by the retailer: '+ retailerCRN + '');
	}


	/**
	 * This transaction will be used to view the lifecycle of the product by fetching transactions from the blockchain.
	 * @param ctx - The transaction context object
	 * @param drugName-medicine name
	 * @param serialNo-serial number of the drug
	 */
	async viewHistory(ctx,drugName, serialNo){
		const drugID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [serialNo,drugName]);		
	    let promiseOfIterator = await ctx.stub.getHistoryForKey(drugID);
	    const results = [];
	    let res = await promiseOfIterator.next();
	    while (!res.done) {
	      if (res.value) {		
		const obj = JSON.parse(res.value.value.toString('utf8'));
		result.push(obj);
	      }
	      res = await iterator.next();
	    }
	    await iterator.close();
	return results;
	}

	/**
	 * This transaction is used to view the current state of the Asset.
	 * @param ctx - The transaction context object
	 * @param drugName-medicine name
	 * @param serialNo-seriel name of the medicine
	 */
	async viewDrugCurrentState(ctx,drugName, serialNo){
		const drugID = ctx.stub.createCompositeKey('org.pharma-network.pharmanet.drug', [serialNo,drugName]);
		let drugBuffer= await ctx.stub.getState(drugID).catch(err => console.log(err));
		let drugObject= JSON.parse(drugBuffer.toString());
		return drugObject;
	}
}
module.exports = pharmanetContract;
