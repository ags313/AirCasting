module Api
  class RegressionsController < BaseController
    before_filter :authenticate_user!, only: :create

    def create
      session = current_user.sessions.find_by_uuid!(params[:session_uuid])
      ref = session.streams.where(JSON.parse(params[:reference])).first
      target = session.streams.where(JSON.parse(params[:target])).first
      respond_with Regression.create_for_streams(target, ref), location: nil
    end

    def index
      respond_with Regression.all
    end
  end
end
