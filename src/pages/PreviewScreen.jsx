import React, { useContext, useState, useEffect } from "react";
import { useHistory, useParams, useLocation } from "react-router-dom";
import { MessageModal } from "@100mslive/hms-video-react";
import { Loading, Button } from "@100mslive/react-ui";
import { v4 } from "uuid";
import { AppContext } from "../store/AppContext";
import PeerlistPreview from "../views/components/PeerlistPreview";
import Preview from "../views/new/Preview";
import getToken from "../services/tokenService";

const PreviewScreen = ({ getUserToken }) => {
  const history = useHistory();
  const context = useContext(AppContext);
  const { loginInfo, setLoginInfo, tokenEndpoint } = context;
  const { roomId: urlRoomId, role: userRole } = useParams();
  const location = useLocation();
  const [token, setToken] = useState(null);
  const [error, setError] = useState({
    title: "",
    body: "",
    fatal: false,
    hideLeave: false,
  });
  const urlSearchParams = new URLSearchParams(location.search);
  const skipPreview = urlSearchParams.get("token") === "beam_recording";

  const tokenErrorBody = errorMessage => (
    <div>
      {errorMessage} If you think this is a mistake, please create{" "}
      <a
        className="text-blue-standard"
        target="_blank"
        href="https://github.com/100mslive/100ms-web/issues"
        rel="noreferrer"
      >
        an issue
      </a>{" "}
      or reach out over{" "}
      <a
        className="text-blue-standard"
        target="_blank"
        href="https://discord.com/invite/kGdmszyzq2"
        rel="noreferrer"
      >
        Discord
      </a>
      .
    </div>
  );

  useEffect(() => {
    if (skipPreview) {
      join({ name: "beam" });
      return;
    }
    if (!userRole) {
      getUserToken(v4())
        .then(token => {
          setToken(token);
        })
        .catch(error => {
          if (error.response && error.response.status === 404) {
            setError({
              title: "Room does not exist",
              body: tokenErrorBody(
                "We could not find the room corresponding to this link."
              ),
              fatal: true,
              hideLeave: true,
            });
          } else {
            console.error("Token API Error", error);
            setError({
              title: "Error fetching token",
              body: "An error occurred while fetching token. Please look into logs for more details",
              fatal: true,
            });
          }
        });
    } else {
      getToken(tokenEndpoint, v4(), userRole, urlRoomId)
        .then(token => {
          setToken(token);
        })
        .catch(error => {
          if (error.response && error.response.status === 404) {
            setError({
              title: "Room does not exist",
              body: tokenErrorBody(
                "We could not find the room corresponding to this link."
              ),
              fatal: true,
              hideLeave: true,
            });
          } else if (error.response && error.response.status === 403) {
            setError({
              title: "Accessing room using this link format is disabled",
              body: tokenErrorBody(""),
              fatal: true,
              hideLeave: true,
            });
          } else {
            setError({
              title: "Error fetching token",
              body: "An error occurred while fetching token. Please look into logs for more details",
              fatal: true,
            });
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loginInfo.env,
    tokenEndpoint,
    urlRoomId,
    getUserToken,
    userRole,
    skipPreview,
  ]);

  const join = name => {
    if (!userRole) {
      getUserToken(name)
        .then(token => {
          setLoginInfo({
            token,
            roomId: urlRoomId,
            username: name,
            isHeadlessMode: skipPreview,
          });
          if (userRole) history.push(`/meeting/${urlRoomId}/${userRole}`);
          else history.push(`/meeting/${urlRoomId}`);
        })
        .catch(error => {
          console.log("Token API Error", error);
          setError({
            title: "Unable to join room",
            body: "Please check your internet connection and try again.",
            fatal: false,
          });
        });
    } else {
      getToken(tokenEndpoint, name, userRole, urlRoomId)
        .then(token => {
          setLoginInfo({
            token,
            role: userRole,
            roomId: urlRoomId,
            username: name,
            isHeadlessMode: skipPreview,
          });
          // send to meeting room now
          if (userRole) history.push(`/meeting/${urlRoomId}/${userRole}`);
          else history.push(`/meeting/${urlRoomId}`);
        })
        .catch(error => {
          console.log("Token API Error", error);
          setError({
            title: "Unable to join room",
            body: "Please check your internet connection and try again.",
            fatal: false,
          });
        });
    }
  };

  const leaveRoom = () => {
    if (userRole) {
      history.push(`/leave/${urlRoomId}/${userRole}`);
    } else {
      history.push(`/leave/${urlRoomId}`);
    }
  };

  const clearError = () => {
    setError({ title: "", body: "", fatal: false });
  };
  if (error.title && error.fatal) {
    return (
      <MessageModal
        title={error.title}
        body={error.body}
        onClose={leaveRoom}
        footer={!error.hideLeave && <Button onClick={leaveRoom}>Leave</Button>}
      />
    );
  }
  return (
    <div className="h-full">
      <div className="flex flex-col justify-center h-full items-center">
        {token ? (
          <>
            <PeerlistPreview />
            <Preview env={loginInfo.env} join={join} token={token} />
          </>
        ) : (
          <Loading size={100} />
        )}
        {error.title && (
          <MessageModal
            title={error.title}
            body={error.body}
            onClose={clearError}
            footer={<Button onClick={clearError}>Dismiss</Button>}
          />
        )}
      </div>
    </div>
  );
};

export default PreviewScreen;
