namespace TaskGenie.Application.Common.Exceptions;

/// <summary>Actor is authenticated but lacks permission for the requested resource. Maps to HTTP 403.</summary>
public class ForbiddenException : Exception
{
    public ForbiddenException(string message = "You do not have permission to perform this action.")
        : base(message) { }
}
