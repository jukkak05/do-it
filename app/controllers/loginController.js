import { getCookies } from "../deps.js";
import { renderFile } from "../deps.js";
import * as taskController from "../controllers/taskController.js";
import * as requestUtils from "../utils/requestUtils.js";

const responseDetails = {
    headers: { "Content-Type": "text/html;charset=UTF-8" },
};

const validateUser = async (request) => {

    // Get cookies
    const cookies = await getCookies(request.headers);

    // If log-in cookie exists, then return true
    if ( cookies.loggedIn === '1' ) {
        return true; 
    } else {
        return false; 
    }

}

const showLoginForm = async (request) => {

    // Show login form
    return new Response(await renderFile("login.eta"), responseDetails);

}
  
const handleLoginForm = async (request) => {

    // Handle form data
    const formData = await request.formData();
    const loginPassword = '0000'; // NOTE: Change this before deployment
    const userPassword = formData.get('password');

    // If user password is correct, then proceed
    if ( loginPassword === userPassword ) {
        return await taskController.viewTasks(request, true);
    } else {
        return await requestUtils.redirectTo("/");
    }

}

export { validateUser, showLoginForm, handleLoginForm };