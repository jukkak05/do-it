const setCookie = async() => {

  const responseDetails = {
    headers: { 
      "Content-Type": "text/html;charset=UTF-8",
      "set-cookie": "loggedIn=1;secure=true;HttpOnly" 
    },
  };

  return responseDetails;

}

const redirectTo = (path) => {
  return new Response(`Redirecting to ${path}.`, {
    status: 303,
    headers: {
      "Location": path,
    },
  });
};

export { setCookie, redirectTo };