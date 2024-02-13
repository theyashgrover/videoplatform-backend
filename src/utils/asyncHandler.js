// Define a higher-order function named asyncHandler that takes a requestHandler function as input
const asyncHandler = (requestHandler) => (req, res, next) => {
    // Wrap the execution of the requestHandler function in a Promise.resolve() call
    // This ensures that the requestHandler function always returns a promise
    return Promise.resolve(requestHandler(req, res, next))
        // If the promise returned by requestHandler resolves successfully, do nothing
        .catch((err) => console.log(err)); // If the promise returned by requestHandler rejects with an error,
                                          // log the error to the console
};

// Export the asyncHandler function from this module
export { asyncHandler };
